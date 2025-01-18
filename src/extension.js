"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
function activate(context) {
    const provider = new MarkdownFilesProvider(context);
    vscode.window.registerTreeDataProvider('markdownFilesView', provider);
    // 设置默认分组和排序方式
    provider.setGroupBy('无分组');
    provider.setSortOrder('最新排序');
    // 注册刷新命令
    context.subscriptions.push(vscode.commands.registerCommand('blogArticleManage.refresh', () => provider.refresh()));
    // 注册排序切换命令
    context.subscriptions.push(vscode.commands.registerCommand('blogArticleManage.changeSortOrder', () => __awaiter(this, void 0, void 0, function* () {
        const sortOrder = yield vscode.window.showQuickPick(['最新排序', '最旧排序'], {
            placeHolder: '选择排序方式'
        });
        if (sortOrder) {
            provider.setSortOrder(sortOrder);
        }
    })));
    // 注册分组切换命令
    context.subscriptions.push(vscode.commands.registerCommand('blogArticleManage.changeGroupBy', () => __awaiter(this, void 0, void 0, function* () {
        const groupBy = yield vscode.window.showQuickPick(['标签', '年份', '无分组'], {
            placeHolder: '选择分组方式'
        });
        if (groupBy) {
            provider.setGroupBy(groupBy);
        }
    })));
}
exports.activate = activate;
class MarkdownFilesProvider {
    constructor(context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.sortOrder = '最新排序';
        this.groupBy = '无分组';
        this.context = context;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setSortOrder(order) {
        this.sortOrder = order;
        this.refresh();
    }
    setGroupBy(group) {
        this.groupBy = group;
        this.refresh();
    }
    getTreeItem(element) {
        if (this.isTagGroup(element)) {
            const treeItem = new vscode.TreeItem(element.tagName, vscode.TreeItemCollapsibleState.Collapsed);
            treeItem.iconPath = {
                light: vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'folder.svg')),
                dark: vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'folder.svg'))
            };
            return treeItem;
        }
        else {
            const readableDate = element.date.toLocaleString();
            const tags = element.tags.join(', ');
            const treeItem = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
            if (this.groupBy === '无分组') {
                // 在无分组模式下，设置描述为日期，详细信息为标签
                treeItem.description = readableDate; // 时间信息显示在右侧
                treeItem.tooltip = `Tags: ${tags}`; // 标签信息显示在标题下方
            }
            else {
                // 在有分组模式下，仅显示日期作为描述，标签信息放在 tooltip 中
                treeItem.description = readableDate;
                treeItem.tooltip = `Tags: ${tags}\n路径: ${element.filePath}`;
            }
            treeItem.resourceUri = vscode.Uri.file(element.filePath);
            treeItem.command = {
                command: 'vscode.open',
                title: '打开文件',
                arguments: [vscode.Uri.file(element.filePath)]
            };
            treeItem.iconPath = {
                light: vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'blog.svg')),
                dark: vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'blog.svg'))
            };
            return treeItem;
        }
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return [];
            }
            const folderPath = workspaceFolders[0].uri.fsPath;
            if (element && this.isTagGroup(element)) {
                if (this.groupBy === '标签') {
                    return this.getMarkdownFilesByTag(element.tagName, folderPath);
                }
                else if (this.groupBy === '年份') {
                    const year = parseInt(element.tagName.replace('年份: ', ''), 10);
                    return this.getMarkdownFilesByYear(year, folderPath);
                }
            }
            else {
                if (this.groupBy === '标签') {
                    return this.getGroupsByTag(folderPath);
                }
                else if (this.groupBy === '年份') {
                    return this.getGroupsByYear(folderPath);
                }
                else if (this.groupBy === '无分组') {
                    return this.getAllMarkdownFiles(folderPath);
                }
            }
            // 添加默认返回
            return [];
        });
    }
    getAllMarkdownFiles(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));
            const markdownFiles = [];
            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);
                if (yamlHeader) {
                    const yamlContent = yaml.load(yamlHeader[1]);
                    if (yamlContent && yamlContent.date && yamlContent.title) {
                        const fileDate = new Date(yamlContent.date);
                        const fileTags = yamlContent.tags || [];
                        markdownFiles.push({
                            filePath,
                            date: fileDate,
                            title: yamlContent.title,
                            tags: fileTags
                        });
                    }
                }
            }
            // 按时间排序
            markdownFiles.sort((a, b) => {
                if (this.sortOrder === '最新排序') {
                    return b.date.getTime() - a.date.getTime();
                }
                else {
                    return a.date.getTime() - b.date.getTime();
                }
            });
            return markdownFiles;
        });
    }
    getGroupsByTag(folderPath) {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));
        const tagsSet = new Set();
        let hasUntagged = false;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);
            if (yamlHeader) {
                const yamlContent = yaml.load(yamlHeader[1]);
                if (yamlContent && yamlContent.date && yamlContent.title) {
                    const fileTags = yamlContent.tags || [];
                    if (fileTags.length === 0) {
                        hasUntagged = true;
                    }
                    else {
                        fileTags.forEach(tag => tagsSet.add(tag));
                    }
                }
            }
        }
        // 获取所有标签并排序
        const tagsArray = Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
        // 按排序顺序排列标签组
        let sortedTags = [];
        if (this.sortOrder === '最新排序') {
            sortedTags = tagsArray; // 最新排序示例，可以根据需要自定义
        }
        else {
            sortedTags = tagsArray.slice().reverse(); // 最旧排序示例
        }
        if (hasUntagged) {
            sortedTags.push('无标签');
        }
        return sortedTags.map(tag => ({ tagName: tag }));
    }
    getGroupsByYear(folderPath) {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));
        const yearsSet = new Set();
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);
            if (yamlHeader) {
                const yamlContent = yaml.load(yamlHeader[1]);
                if (yamlContent && yamlContent.date && yamlContent.title) {
                    const fileDate = new Date(yamlContent.date);
                    const fileYear = fileDate.getFullYear().toString();
                    yearsSet.add(fileYear);
                }
            }
        }
        // 获取所有年份并排序
        const yearsArray = Array.from(yearsSet).sort((a, b) => Number(a) - Number(b));
        // 按排序顺序排列年份组
        let sortedYears = [];
        if (this.sortOrder === '最新排序') {
            sortedYears = yearsArray.slice().reverse();
        }
        else {
            sortedYears = yearsArray;
        }
        return sortedYears.map(year => ({ tagName: `年份: ${year}` }));
    }
    getMarkdownFilesByTag(tag, folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));
            const markdownFiles = [];
            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);
                if (yamlHeader) {
                    const yamlContent = yaml.load(yamlHeader[1]);
                    if (yamlContent && yamlContent.date && yamlContent.title) {
                        const fileDate = new Date(yamlContent.date);
                        const fileTags = yamlContent.tags || [];
                        if (fileTags.includes(tag)) {
                            markdownFiles.push({
                                filePath,
                                date: fileDate,
                                title: yamlContent.title,
                                tags: fileTags
                            });
                        }
                    }
                }
            }
            // 按时间排序
            markdownFiles.sort((a, b) => {
                if (this.sortOrder === '最新排序') {
                    return b.date.getTime() - a.date.getTime();
                }
                else {
                    return a.date.getTime() - b.date.getTime();
                }
            });
            return markdownFiles;
        });
    }
    getMarkdownFilesByYear(year, folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));
            const markdownFiles = [];
            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);
                if (yamlHeader) {
                    const yamlContent = yaml.load(yamlHeader[1]);
                    if (yamlContent && yamlContent.date && yamlContent.title) {
                        const fileDate = new Date(yamlContent.date);
                        if (fileDate.getFullYear() === year) {
                            const fileTags = yamlContent.tags || [];
                            markdownFiles.push({
                                filePath,
                                date: fileDate,
                                title: yamlContent.title,
                                tags: fileTags
                            });
                        }
                    }
                }
            }
            // 按时间排序
            markdownFiles.sort((a, b) => {
                if (this.sortOrder === '最新排序') {
                    return b.date.getTime() - a.date.getTime();
                }
                else {
                    return a.date.getTime() - b.date.getTime();
                }
            });
            return markdownFiles;
        });
    }
    isTagGroup(element) {
        return element.tagName !== undefined;
    }
}
function deactivate() { }
exports.deactivate = deactivate;
