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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const MarkdownFilesProvider_1 = require("./MarkdownFilesProvider");
function activate(context) {
    const provider = new MarkdownFilesProvider_1.MarkdownFilesProvider(context);
    vscode.window.registerTreeDataProvider('markdownFilesView', provider);
    // 注册刷新命令
    const refreshCommand = vscode.commands.registerCommand('blogArticleManage.refresh', () => {
        provider.refresh();
    });
    context.subscriptions.push(refreshCommand);
    // 注册排序切换命令
    const changeSortOrderCommand = vscode.commands.registerCommand('blogArticleManage.changeSortOrder', async () => {
        const sortOrder = await vscode.window.showQuickPick(['最新排序', '最旧排序'], {
            placeHolder: '选择排序方式'
        });
        if (sortOrder) {
            provider.setSortOrder(sortOrder);
        }
    });
    context.subscriptions.push(changeSortOrderCommand);
    // 注册分组切换命令
    const changeGroupByCommand = vscode.commands.registerCommand('blogArticleManage.changeGroupBy', async () => {
        const groupBy = await vscode.window.showQuickPick(['标签', '年份', '无分组'], {
            placeHolder: '选择分组方式'
        });
        if (groupBy) {
            provider.setGroupBy(groupBy);
        }
    });
    context.subscriptions.push(changeGroupByCommand);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map