﻿// Copyright (C) 2021 Guyutongxue
// 
// This file is part of VSCodeConfigHelper.
// 
// VSCodeConfigHelper is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// VSCodeConfigHelper is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with VSCodeConfigHelper.  If not, see <http://www.gnu.org/licenses/>.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using CommandLine;

namespace VSCodeConfigHelper3 {

    delegate string RequestHandler(string requestBody);

    class FolderGetter {

        [DllImport("kernel32.dll", ExactSpelling = true)]
        private static extern IntPtr GetConsoleWindow();

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        // bring console to front before launching FolderBrowserDialog
        // https://stackoverflow.com/a/12066376
        private void BringConsoleToFront() {
            SetForegroundWindow(GetConsoleWindow());
        }


        private string scriptLocation;
        private string powershellLocation;

        private void GenerateScript() {
            Assembly current = typeof(Program).GetTypeInfo().Assembly;
            using (var reader = current.GetManifestResourceStream(@"VSCodeConfigHelper3.scripts.get-folder.ps1")) {
                if (reader is null) {
                    throw new FileNotFoundException("Cannot read PowerShell script from assembly.");
                }
                if (File.Exists(scriptLocation)) {
                    File.Delete(scriptLocation);
                }
                using (var writer = File.Create(scriptLocation)) {
                    reader.Seek(0, SeekOrigin.Begin);
                    reader.CopyTo(writer);
                }
            }
        }

        public FolderGetter() {
            scriptLocation = Path.Join(Path.GetTempPath(), "get-folder.ps1");
            powershellLocation = Environment.ExpandEnvironmentVariables(@"%SystemRoot%\system32\WindowsPowerShell\v1.0\powershell.exe");
            GenerateScript();
        }

        public string? Get(string initDir) {
            if (!File.Exists(scriptLocation)) {
                GenerateScript();
            }
            BringConsoleToFront();
            try {
                var proc = new Process {
                    StartInfo = new ProcessStartInfo {
                        FileName = powershellLocation,
                        ArgumentList = {
                            "-Sta",
                            "-ExecutionPolicy",
                            "Bypass",
                            "-File",
                            scriptLocation,
                            initDir
                        },
                        RedirectStandardOutput = true,
                        CreateNoWindow = true,
                    }
                };
                proc.Start();
                string output = proc.StandardOutput.ReadToEnd();
                proc.WaitForExit();
                if (string.IsNullOrWhiteSpace(output)) {
                    return null;
                }
                return output.Trim();
            }
            catch (Exception ex) {
                Debug.WriteLine(ex.ToString());
                return null;
            }

        }
    }

    static class Program {

        static EnvResolver? env = null;
        static Server? server = null;
        static ConfGenerator? config = null;

        static FolderGetter folderGetter = new();

        #region Handlers definition

        static string HandleGetEnv(string _) {
            var json = JsonSerializer.Serialize(env);
            Console.WriteLine(json);
            return json;
        }

        static string HandleGetFolder(string initDir) {
            return folderGetter.Get(initDir) ?? "";
        }

        static string HandleVerifyVscode(string path) {
            if (Path.GetFileName(path) == "bin") {
                path = Path.GetDirectoryName(path) ?? path;
            }
            if (Directory.Exists(path) && File.Exists(Path.Join(path, "Code.exe"))) {
                return "valid";
            } else {
                return "invalid";
            }
        }

        static string HandleVerifyCompiler(string path) {
            if (Path.GetFileName(path) != "bin") {
                path = Path.Join(path, "bin");
            }
            var versionText = EnvResolver.TestCompiler(path);
            if (versionText is null) return JsonSerializer.Serialize(new {
                valid = false
            });
            var info = new CompilerInfo(path, versionText);
            return JsonSerializer.Serialize(new {
                valid = true,
                info = info
            });
        }

        static string HandleSaveProfile(string profile) {
            using (var writer = File.CreateText("profile.json")) {
                writer.Write(profile);
            }
            return "ok";
        }

        static string HandleLoadProfile(string profile) {
            if (!File.Exists("profile.json")) {
                return "null";
            }
            using (var reader = File.OpenText("profile.json")) {
                profile = reader.ReadToEnd();
            }
            return profile;
        }

        static string HandleDone(string req) {
            var document = JsonDocument.Parse(req);
            var root = document.RootElement;
            var success = root.GetProperty("success");
            if (success.ValueKind == JsonValueKind.False) {
                return "ok";
            }
            var configText = root.GetProperty("config").GetRawText();
            var options = JsonSerializer.Deserialize<ConfigOptions>(configText);
            if (options is not null) {
                config = new ConfGenerator(options);
            }
            return "ok";
        }

        #endregion

        static void Main(string[] args) {
            if (Environment.OSVersion.Version.Major < 10) {
                Console.WriteLine("此程序要求 Windows 10 或更高版本的操作系统。程序将退出。");
                return;
            }

            env = new EnvResolver();

            server = new Server(out string serveUrl);
            server.AddHandler("/getEnv", HandleGetEnv);
            server.AddHandler("/getFolder", HandleGetFolder);
            server.AddHandler("/verifyVscode", HandleVerifyVscode);
            server.AddHandler("/verifyCompiler", HandleVerifyCompiler);
            server.AddHandler("/saveProfile", HandleSaveProfile);
            server.AddHandler("/loadProfile", HandleLoadProfile);
            server.AddHandler("/done", HandleDone, true);
            Server.OpenBrowser(serveUrl);
            server.Run();

            if (config is null) {
                Console.WriteLine("配置中止。程序将退出。");
                return;
            }
            config.Generate();
        }
    }
}