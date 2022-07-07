// Copyright (C) 2021 Guyutongxue
// 
// This file is part of VS Code Config Helper.
// 
// VS Code Config Helper is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// VS Code Config Helper is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with VS Code Config Helper.  If not, see <http://www.gnu.org/licenses/>.

#pragma once

#include <nlohmann/json.hpp>
#include <string>
#include <string_view>
#include <unordered_set>
#include <vector>
#include <optional>

#include <boost/filesystem.hpp>

enum class LanguageType { Cpp, C };

struct BaseOptions {
    enum class GenTestType { Auto, Always, Never };

    std::string WorkspacePath;
    std::string VscodePath;
    LanguageType Language;
    std::string LanguageStandard;
    std::vector<std::string> CompileArgs;
    bool UseExternalTerminal;

    bool ShouldInstallL10n;
    bool OfflineInstallCCpp;
    bool ShouldUninstallExtensions;

    GenTestType GenerateTestFile;

    bool OpenVscodeAfterConfig;
    bool NoSendAnalytics;

    virtual ~BaseOptions() = default;
};

struct WindowsOptions : BaseOptions {
    bool UseGui;

    std::string MingwPath;

    bool ApplyNonAsciiCheck;
    bool NoSetEnv;
    bool GenerateDesktopShortcut;
};

struct PosixOptions : BaseOptions {
    std::string Compiler;
};

struct AppleOptions : PosixOptions {
    bool NoInstallClt;
};

#ifdef _WIN32
using CurrentOptions = WindowsOptions;
#elif defined(__APPLE__)
using CurrentOptions = AppleOptions;
#else
using CurrentOptions = PosixOptions;
#endif

class ExtensionManager {
    boost::filesystem::path scriptPath;
    std::unordered_set<std::string> installedExtensions;
    // clang-format off
    std::unordered_set<std::string> shouldUninstallExtensions{
        "formulahendry.code-runner",
        "austin.code-gnu-global",
        "danielpinto8zz6.c-cpp-compile-run",
        "mitaki28.vscode-clang",
        "jaycetyle.vscode-gnu-global",
        "franneck94.c-cpp-runner",
        "ajshort.include-autocomplete",
        "xaver.clang-format",
        "jbenden.c-cpp-flylint"
    };
    // clang-format on
    std::string runScript(const std::initializer_list<std::string>& args);

public:
    ExtensionManager(const boost::filesystem::path& vscodePath);

    std::unordered_set<std::string> list();
    void install(const std::string& id);
    void uninstall(const std::string& id);

    void uninstallAll();
};

class Generator {
    CurrentOptions options;

    const char* fileExt();
    
    std::string compilerPath();
    std::string debuggerPath();
    std::string scriptPath(const std::string& filename);

    void saveFile(const boost::filesystem::path& path, const char* content);
    void addKeybinding(const std::string& key, const std::string& command, const std::string& args);
    void addToPath(const boost::filesystem::path& path);

    void generateTasksJson(const boost::filesystem::path& path);
    void generateLaunchJson(const boost::filesystem::path& path);
    void generatePropertiesJson(const boost::filesystem::path& path);

    std::string generateTestFile();
    void openVscode(const std::optional<std::string>& filepath);
    void generateShortcut();
    void sendAnalytics();

public:
    Generator(CurrentOptions options);
    void generate();

    static boost::filesystem::path scriptDirectory(const CurrentOptions& options);
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(WindowsOptions, VscodePath, MingwPath, WorkspacePath, Language,
                                   LanguageStandard, CompileArgs, NoSetEnv, UseExternalTerminal,
                                   ApplyNonAsciiCheck, ShouldInstallL10n, ShouldUninstallExtensions,
                                   GenerateTestFile, GenerateDesktopShortcut, OpenVscodeAfterConfig,
                                   NoSendAnalytics);
