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

/**
 * Get the directory name of path
 * @param path {string}
 * @return {string}
 */
function dirname(path) {
    return path.match(/(.*)[\/\\]/)[1] || '';
}
/**
 * Determines whether a string is all ascii characters
 * @param str {string}
 * @return {boolean}
 */
function isAscii(str) {
    return /^[\x20-\x7F]*$/.test(str);
}

const param = new URLSearchParams(window.location.search);
if (!param.has("port")) {
    alert("未传入本地端口。无法继续配置。");
    window.location = "about:blank";
}

const DEBOUNCE_TIME = 200;
const GYTX_LINK = "https://gytx.lanzoux.com/ibibbokvokj";
const TDM_LINK = "https://wws.lanzoux.com/iMhd6ge4qkf";
const MINGW_LINK = "https://wws.lanzoux.com/iuRLbge4bni";
const HOST = "http://localhost:" + param.get("port");
const LANG_CPP = 0;
const LANG_C = 1;
const STYLE_INTERNAL = 0;
const STYLE_EXTERNAL = 1;
const MINIMUM_REQUIRED_VERSION = "3.0.0";
const vm = new Vue({
    el: '#app',
    created: function () {
        fetch(`${HOST}/getEnv`, {
            method: 'POST'
        })
            .then(r => r.json())
            .catch(_ => {
                alert("尝试与本地工具通信失败。无法继续配置。");
                window.location = "about:blank";
            })
            .then(v => {
                console.log(v);
                // v3.0.2 above
                if ("Version" in v) {
                    this.backendVersion = v.Version;
                    fetch("https://api.github.com/repos/Guyutongxue/VSCodeConfigHelper3/releases/latest")
                        .then(r => r.json())
                        .then(v => {
                            const latest = v["tag_name"].substr(1);
                            if (compareVersions(latest, this.backendVersion) === 1) {
                                this.latestVersion = latest;
                            }
                        });
                }
                if (compareVersions(MINIMUM_REQUIRED_VERSION, this.backendVersion) === 1) {
                    alert(`您的工具版本为 ${this.backendVersion}，无法继续配置。版本低于 ${MINIMUM_REQUIRED_VERSION} 的工具已不再支持，请及时更新。`);
                    window.location = "https://v3.vscch.tk/";
                }
                if (v.VscodePath === null) {
                    this.vscodeStatus = "unresolved";
                    this.vscodePath = "";
                } else {
                    this.vscodeStatus = "resolved";
                    // Get folder name (not exe)
                    this.vscodePath = dirname(v.VscodePath);
                }
                this.loading = false;
                // v3.1.0 above
                if ("Gbk" in v && v.Gbk === true) {
                    this.enableGbk = true;
                }
                this.compilers = v.Compilers.map(m => ({
                    path: dirname(m.Path),
                    version: m.VersionNumber,
                    packageInfo: m.PackageString,
                    // v3.1.1 above
                    not64Bit: "Not64Bit" in m ? m.Not64Bit : false,
                }));
                // select the first one only if there is only one
                if (this.compilers.length === 1) {
                    this.mingwTableSelected.push(this.compilers[0]);
                }
                this.newCompiler = this.compilers.length === 0 ? 1 : 0;
            })
            .then(() => this.loadProfile());
        fetch("mingw.json").then(r => r.json()).then((/** @type {string[]} */ v) => {
            v.forEach((link, idx) => {
                this.mingwDlLinks[idx].url = link;
            });
        });

    },
    data: {
        loading: true,
        currentStep: 1,
        backendVersion: "3.0.0",
        latestVersion: null,
        vscodePath: "",
        vscodeStatus: "resolved",
        mingwTableHeader: [
            {
                text: '路径',
                value: 'path'
            },
            {
                text: '版本',
                value: 'version'
            },
            {
                text: '包信息',
                value: 'packageInfo'
            }
        ],
        /** @type {{
         *  path: string, // Without 'bin'!
         *  version: string,
         *  packageInfo: string
         * }[] }*/
        compilers: [],
        mingwTableSelected: [],
        newCompiler: 0,
        newCompilerPath: "",
        newCompilerValid: false,
        newCompilerInvalidReason: "",
        newCompilerInfo: {},
        mingwDlLinks: [
            {
                title: "最新版",
                subtitle: "由谷雨同学构建",
                url: GYTX_LINK
            },
            {
                title: "TDM-GCC",
                subtitle: "经过优化的版本",
                url: TDM_LINK
            },
            {
                title: "官方版",
                subtitle: "SourceForge 提供",
                url: MINGW_LINK
            }
        ],
        workspacePath: "",
        workspaceStatus: "ok",
        optionsProfile: 2,
        optionsTab: 0,
        language: 0, // 0: C++, 1: C
        cStandards: [
            {
                text: '根据编译器自动选择',
                value: ''
            },
            {
                text: 'C89',
                value: 'c89'
            },
            {
                text: 'C99',
                value: 'c99'
            },
            {
                text: 'C11',
                value: 'c11'
            },
            {
                text: 'C18',
                value: 'c18'
            }
        ],
        cppStandards: [
            {
                text: '根据编译器自动选择',
                value: ''
            },
            {
                text: 'C++98',
                value: 'c++98'
            },
            {
                text: 'C++03',
                value: 'c++03'
            },
            {
                text: 'C++11',
                value: 'c++11'
            },
            {
                text: 'C++14',
                value: 'c++14'
            },
            {
                text: 'C++17',
                value: 'c++17'
            },
            {
                text: 'C++20',
                value: 'c++20'
            },
            {
                text: 'C++23',
                value: 'c++23'
            }
        ],
        cStandard: '',
        cppStandard: '',
        gnuEx: false,
        optimization: '',
        wall: false,
        wextra: false,
        werror: false,
        enableGbk: false,
        fexecCharsetGbk: false,
        staticStd: false,
        customOptions: [],
        dbgStyle: 0, // 0: internal, 1: external
        nonAsciiCheck: false,
        instL10n: false,
        offlineExt: false,
        uninstExt: false,
        uninstList: [
            "formulahendry.code-runner",
            "austin.code-gnu-global",
            "danielpinto8zz6.c-cpp-compile-run",
            "mitaki28.vscode-clang",
            "jaycetyle.vscode-gnu-global",
            "franneck94.c-cpp-runner",
            "ajshort.include-autocomplete",
            "xaver.clang-format",
            "jbenden.c-cpp-flylint"
        ],
        setEnv: true,
        genTest: 0,
        genTestText: ['自动', '重新生成', '不生成'],
        genShortcut: false,
        openVscode: true,
        sendAnalytics: true,
        confirmDiag: false,
        configuring: false
    },
    computed: {
        vscodeOk: function () {
            return this.vscodeStatus === 'valid' || this.vscodeStatus === 'resolved';
        },
        mingw: function () {
            if (this.newCompiler === 0) {
                return this.mingwTableSelected.length === 1 ? this.mingwTableSelected[0] : null;
            } else {
                return this.newCompilerInfo;
            }
        },
        mingwNot64Bit: function () {
            return this.mingw?.not64Bit ?? false;
        },
        mingwOk: function () {
            if (this.newCompiler === 0) {
                return this.mingwTableSelected.length === 1;
            } else {
                return this.newCompilerValid;
            }
        },
        workspaceOk: function () {
            /** @type {string} */
            const trimmed = this.workspacePath.trim();
            if (trimmed === "") return false;
            return isAscii(trimmed);
        },
        standardId: function () {
            function getLatestSupportStandardFromCompiler(version) {
                if (!version) return ['c++14', 'c11'];
                const majorVersion = parseInt(version.split('.')[0]);
                if (majorVersion < 5) {
                    const minorVersion = parseInt(version.split('.')[1]);
                    if (majorVersion === 4 && minorVersion > 7) {
                        return ['c++11', 'c11'];
                    } else {
                        return ['c++98', 'c99'];
                    }
                } else {
                    switch (majorVersion) {
                        case 5: return ['c++14', 'c11'];
                        case 6: return ['c++14', 'c11'];
                        case 7: return ['c++14', 'c11'];
                        case 8: return ['c++17', 'c18'];
                        case 9: return ['c++17', 'c18'];
                        case 10: return ['c++20', 'c18'];
                        case 11: return ['c++23', 'c18'];

                        default: return ['c++14', 'c11'];
                    }
                }
            }
            if (this.language === LANG_CPP) {
                const standard = this.cppStandard === "" ? getLatestSupportStandardFromCompiler(this.mingw?.version)[0] : this.cppStandard;
                if (this.gnuEx === true) {
                    return standard.replace("c++", "gnu++");
                } else {
                    return standard;
                }
            } else {
                const standard = this.cStandard === "" ? getLatestSupportStandardFromCompiler(this.mingw?.version)[1] : this.cStandard;
                if (this.gnuEx === true) {
                    return standard.replace("c", "gnu");
                } else {
                    return standard;
                }
            }
        },
        compileArgs: function () {
            const args = [];
            args.push("-std=" + this.standardId);
            if (this.optimization !== "") {
                args.push(this.optimization);
            }
            if (this.wall === true) {
                args.push("-Wall");
            }
            if (this.wextra === true) {
                args.push("-Wextra");
            }
            if (this.werror === true) {
                args.push("-Werror");
            }
            if (this.enableGbk === true && this.fexecCharsetGbk === true) {
                args.push("-fexec-charset=GBK");
            }
            if (this.staticStd === true) {
                args.push("-static-libgcc");
                if (this.language === LANG_CPP) {
                    args.push("-static-libstdc++");
                }
            }
            return args.concat(this.customOptions);
        }
    },
    subscriptions: function () {
        this.$watchAsObservable('vscodePath').pipe(
            rxjs.operators.debounceTime(DEBOUNCE_TIME),
            rxjs.operators.switchMap(() => {
                return rxjs.from(fetch(`${HOST}/verifyVscode`, {
                    method: "POST",
                    body: this.vscodePath
                }).then(r => r.text()));
            })
        ).subscribe(v => {
            if (this.vscodeStatus === "resolved" && v === "valid")
                return;
            if (this.vscodeStatus === "unresolved" && v === "invalid")
                return;
            this.vscodeStatus = v;
        });
        this.$watchAsObservable('newCompilerPath').pipe(
            rxjs.operators.debounceTime(DEBOUNCE_TIME),
            rxjs.operators.switchMap(() => {
                return rxjs.from(fetch(`${HOST}/verifyCompiler`, {
                    method: 'POST',
                    body: this.newCompilerPath
                }).then(r => r.json()));
            }),
        ).subscribe(v => {
            this.newCompilerValid = v.valid;
            if (v.valid === true) {
                this.newCompilerInfo = {
                    path: dirname(v.info.Path),
                    version: v.info.VersionNumber,
                    packageInfo: v.info.PackageString,
                    // v3.1.1 above
                    not64Bit: "Not64Bit" in v.info ? v.info.Not64Bit : false,
                }
            } else {
                switch (v.reason) {
                    case "not_found": this.newCompilerInvalidReason = "此路径下未检测到 MinGW。"; break;
                    case "semicolon": this.newCompilerInvalidReason = "路径中不得含有分号。"; break;
                    default: this.newCompilerInvalidReason = "此路径不合法。"; break;
                }
                this.newCompilerInfo = {};
            }
        });
        this.$watchAsObservable('workspacePath').pipe(
            rxjs.operators.debounceTime(DEBOUNCE_TIME),
            rxjs.operators.filter(v => v !== ""),
            rxjs.operators.switchMap(() => {
                return rxjs.from(fetch(`${HOST}/verifyWorkspace`, {
                    method: 'POST',
                    body: this.workspacePath
                }).then(r => r.text()));
            })
        ).subscribe(v => {
            this.workspaceStatus = v;
        });
        return {
        };
    },
    methods: {
        isAscii: isAscii,
        download: function (url) {
            window.open(url, '_blank');
        },
        getVscode: function () {
            alert("即将跳转到下载地址。请您在安装完 VS Code 后先启动一次再使用本工具。");
            window.location = "https://update.code.visualstudio.com/latest/win32-x64-user/stable";
        },
        showUninstList: function () {
            alert(this.uninstList.join("\n"));
        },
        next: function () {
            this.currentStep++;
        },
        prev: function () {
            this.currentStep--;
        },
        cancel: async function () {
            // this.currentStep = 1;
            try {
                await this.saveProfile();
            } catch (_) { }
            if (confirm('确定中止本次配置吗？')) {
                fetch(`${HOST}/done`, {
                    method: "POST",
                    body: JSON.stringify({
                        success: false
                    })
                }).then(r => r.text()).finally(() => {
                    alert("配置已中止，您可以关闭此页面了。");
                    window.location = "about:blank";
                });
            }
        },
        finish: async function () {
            await this.saveProfile();
            const result = this.getConfigResult();
            this.configuring = true;
            fetch(`${HOST}/done`, {
                method: 'POST',
                body: JSON.stringify({
                    success: true,
                    config: result
                })
            }).then(r => r.text()).then((v) => {
                console.log("result: ", v);
                if (v === "ok"){
                    window.location = "donate.html";
                } else {
                    alert("配置时出现错误：" + v);
                    window.location = "about:blank";
                }
            });
        },
        getFolder: function (initDir, target) {
            fetch(`${HOST}/getFolder`, {
                method: "POST",
                body: initDir ?? ""
            }).then(r => r.text()).then(data => {
                if (data !== "") {
                    switch (target) {
                        case "mingw": this.newCompilerPath = data; break;
                        case "vscode": this.vscodePath = data; break;
                        case "workspace": this.workspacePath = data; break;
                    }
                }
            });
        },
        applyProfile: function (type) {
            if (type === 'default') {
                this.language = LANG_CPP;
                this.cppStandard = '';
                this.cStandard = '';
                this.gnuEx = false;
                this.optimization = '';
                this.wall = false;
                this.wextra = false;
                this.werror = false;
                this.fexecCharsetGbk = false;
                this.staticStd = false;
                this.dbgStyle = STYLE_INTERNAL;
                this.nonAsciiCheck = false;
                this.instL10n = false;
                this.offlineExt = false;
                this.uninstExt = false;
                this.setEnv = true;
                this.genTest = 0;
                this.genShortcut = false;
                this.openVscode = true;
                this.sendAnalytics = true;
            } else if (type === 'newbie') {
                this.language = LANG_CPP;
                this.cppStandard = '';
                this.cStandard = '';
                this.gnuEx = false;
                this.optimization = '';
                this.wall = true;
                this.wextra = true;
                this.werror = false;
                if (this.enableGbk === true) this.fexecCharsetGbk = true;
                this.staticStd = false;
                this.dbgStyle = STYLE_EXTERNAL;
                this.nonAsciiCheck = true;
                this.instL10n = true;
                this.offlineExt = true;
                this.uninstExt = true;
                this.setEnv = true;
                this.genTest = 0;
                this.genShortcut = true;
                this.openVscode = true;
                this.sendAnalytics = true;
            } else {
                throw new Error(`Unknown profile type: ${type}`);
            }
        },
        saveProfile: function () {
            return fetch(`${HOST}/saveProfile`, {
                method: 'POST',
                body: JSON.stringify({
                    workspacePath: this.workspacePath,
                    language: this.language,
                    cppStandard: this.cppStandard,
                    cStandard: this.cStandard,
                    gnuEx: this.gnuEx,
                    optimization: this.optimization,
                    wall: this.wall,
                    wextra: this.wextra,
                    werror: this.werror,
                    fexecCharsetGbk: this.fexecCharsetGbk,
                    staticStd: this.staticStd,
                    dbgStyle: this.dbgStyle,
                    nonAsciiCheck: this.nonAsciiCheck,
                    instL10n: this.instL10n,
                    offlineExt: this.offlineExt,
                    uninstExt: this.uninstExt,
                    setEnv: this.setEnv,
                    genTest: this.genTest,
                    genShortcut: this.genShortcut,
                    openVscode: this.openVscode,
                    sendAnalytics: this.sendAnalytics
                })
            }).then(r => r.text());
        },
        loadProfile: function () {
            fetch(`${HOST}/loadProfile`, {
                method: 'POST',
            }).then(r => r.json()).then(data => {
                if (data === null) return;
                for (const key in data) {
                    this[key] = data[key];
                }
                if (this.enableGbk === false) {
                    this.fexecCharsetGbk = false;
                }
            });
        },
        getConfigResult: function () {
            // match 'class ConfigOptions' in backend
            switch (this.backendVersion) {
                case "3.0.0":
                case "3.0.1":
                case "3.0.2":
                    return {
                        VscodePath: this.vscodePath + "\\Code.exe",
                        MingwPath: this.mingw?.path + "\\bin" ?? null,
                        WorkspacePath: this.workspacePath,
                        Language: this.language,
                        LanguageStandard: this.standardId,
                        CompileArgs: this.compileArgs,
                        NoSetEnv: !this.setEnv,
                        UseExternalTerminal: this.dbgStyle === STYLE_EXTERNAL,
                        ApplyNonAsciiCheck: this.nonAsciiCheck,
                        ShouldInstallL11n: this.instL10n,
                        OfflineInstallCCpp: this.offlineExt,
                        ShouldUninstallExtensions: this.uninstExt,
                        GenerateTestFile: this.genTest,
                        GenerateDesktopShortcut: this.genShortcut,
                        OpenVscodeAfterConfig: this.openVscode,
                        NoSendAnalytics: !this.sendAnalytics
                    };
                case "3.1.0":
                default:
                    return {
                        VscodePath: this.vscodePath + "\\Code.exe",
                        MingwPath: this.mingw?.path + "\\bin" ?? null,
                        WorkspacePath: this.workspacePath,
                        Language: this.language,
                        LanguageStandard: this.standardId,
                        CompileArgs: this.compileArgs,
                        NoSetEnv: !this.setEnv,
                        UseExternalTerminal: this.dbgStyle === STYLE_EXTERNAL,
                        ApplyNonAsciiCheck: this.nonAsciiCheck,
                        ShouldInstallL10n: this.instL10n,
                        OfflineInstallCCpp: this.offlineExt,
                        ShouldUninstallExtensions: this.uninstExt,
                        GenerateTestFile: this.genTest,
                        GenerateDesktopShortcut: this.genShortcut,
                        OpenVscodeAfterConfig: this.openVscode,
                        NoSendAnalytics: !this.sendAnalytics
                    };
            }
        },
    },
    vuetify: new Vuetify(),
});
