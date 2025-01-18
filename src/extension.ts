import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface MarkdownFile {
    filePath: string;
    date: Date;
    title: string;
    tags: string[];
}

interface TagGroup {
    tagName: string;
}

interface YamlHeader {
    title: string;
    date: string;
    tags?: string[];
}

type GroupBy = '标签' | '年份' | '无分组';

type SortOrder = '最新排序' | '最旧排序';

export function activate(context: vscode.ExtensionContext) {
    console.log('BlogMan extension is now active!'); // 确认扩展激活

    const provider = new MarkdownFilesProvider(context);
    vscode.window.registerTreeDataProvider('markdownFilesView', provider);

    // 设置默认分组和排序方式
    provider.setGroupBy('无分组');
    provider.setSortOrder('最新排序');

    // 注册刷新命令
    let refreshCommand = vscode.commands.registerCommand('blogArticleManage.refresh', () => {
        // 在这里实现刷新逻辑
        vscode.window.showInformationMessage('Blog Article Manage Refreshed!');
        provider.refresh(); // 刷新树视图
    });

    context.subscriptions.push(refreshCommand);
    console.log('Registered command: blogArticleManage.refresh'); // 确认命令注册

    // 注册排序切换命令
    context.subscriptions.push(
        vscode.commands.registerCommand('blogArticleManage.changeSortOrder', async () => {
            const sortOrder = await vscode.window.showQuickPick(['最新排序', '最旧排序'], {
                placeHolder: '选择排序方式'
            });

            if (sortOrder) {
                provider.setSortOrder(sortOrder as SortOrder);
            }
        })
    );

    // 注册分组切换命令
    context.subscriptions.push(
        vscode.commands.registerCommand('blogArticleManage.changeGroupBy', async () => {
            const groupBy = await vscode.window.showQuickPick(['标签', '年份', '无分组'], {
                placeHolder: '选择分组方式'
            });

            if (groupBy) {
                provider.setGroupBy(groupBy as GroupBy);
            }
        })
    );
}

class MarkdownFilesProvider implements vscode.TreeDataProvider<MarkdownFile | TagGroup> {
    private _onDidChangeTreeData: vscode.EventEmitter<MarkdownFile | TagGroup | undefined | void> = new vscode.EventEmitter<MarkdownFile | TagGroup | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<MarkdownFile | TagGroup | undefined | void> = this._onDidChangeTreeData.event;

    private sortOrder: SortOrder = '最新排序';
    private groupBy: GroupBy = '无分组';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setSortOrder(order: SortOrder): void {
        this.sortOrder = order;
        this.refresh();
    }

    setGroupBy(group: GroupBy): void {
        this.groupBy = group;
        this.refresh();
    }

    getTreeItem(element: MarkdownFile | TagGroup): vscode.TreeItem {
        if (this.isTagGroup(element)) {
            const treeItem = new vscode.TreeItem(element.tagName, vscode.TreeItemCollapsibleState.Collapsed);
            treeItem.iconPath = {
                light: vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'folder.svg')),
                dark: vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'folder.svg'))
            };
            return treeItem;
        } else {
            const readableDate = element.date.toLocaleString();
            const tags = element.tags.join(', ');

            const treeItem = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);

            if (this.groupBy === '无分组') {
                // 在无分组模式下，设置描述为日期，详细信息为标签
                treeItem.description = readableDate; // 时间信息显示在右侧
                treeItem.tooltip = `Tags: ${tags}`; // 标签信息显示在标题下方
            } else {
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

    async getChildren(element?: MarkdownFile | TagGroup): Promise<(MarkdownFile | TagGroup)[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const folderPath = workspaceFolders[0].uri.fsPath;

        if (element && this.isTagGroup(element)) {
            if (this.groupBy === '标签') {
                return this.getMarkdownFilesByTag(element.tagName, folderPath);
            } else if (this.groupBy === '年份') {
                const year = parseInt(element.tagName.replace('年份: ', ''), 10);
                return this.getMarkdownFilesByYear(year, folderPath);
            }
        } else {
            if (this.groupBy === '标签') {
                return this.getGroupsByTag(folderPath);
            } else if (this.groupBy === '年份') {
                return this.getGroupsByYear(folderPath);
            } else if (this.groupBy === '无分组') {
                return this.getAllMarkdownFiles(folderPath);
            }
        }

        // 添加默认返回
        return [];
    }

    private async getAllMarkdownFiles(folderPath: string): Promise<MarkdownFile[]> {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));

        const markdownFiles: MarkdownFile[] = [];

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);

            if (yamlHeader) {
                const yamlContent = yaml.load(yamlHeader[1]) as YamlHeader;
                if (yamlContent && yamlContent.date && yamlContent.title) {
                    const fileDate: Date = new Date(yamlContent.date);
                    const fileTags: string[] = yamlContent.tags || [];

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
            } else {
                return a.date.getTime() - b.date.getTime();
            }
        });

        return markdownFiles;
    }

    private getGroupsByTag(folderPath: string): TagGroup[] {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));

        const tagsSet: Set<string> = new Set();
        let hasUntagged = false;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);

            if (yamlHeader) {
                const yamlContent = yaml.load(yamlHeader[1]) as YamlHeader;
                if (yamlContent && yamlContent.date && yamlContent.title) {
                    const fileTags: string[] = yamlContent.tags || [];

                    if (fileTags.length === 0) {
                        hasUntagged = true;
                    } else {
                        fileTags.forEach(tag => tagsSet.add(tag));
                    }
                }
            }
        }

        // 获取所有标签并排序
        const tagsArray = Array.from(tagsSet).sort((a, b) => a.localeCompare(b));

        // 按排序顺序排列标签组
        let sortedTags: string[] = [];
        if (this.sortOrder === '最新排序') {
            sortedTags = tagsArray; // 最新排序示例，可以根据需要自定义
        } else {
            sortedTags = tagsArray.slice().reverse(); // 最旧排序示例
        }

        if (hasUntagged) {
            sortedTags.push('无标签');
        }

        return sortedTags.map(tag => ({ tagName: tag }));
    }

    private getGroupsByYear(folderPath: string): TagGroup[] {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));

        const yearsSet: Set<string> = new Set();

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);

            if (yamlHeader) {
                const yamlContent = yaml.load(yamlHeader[1]) as YamlHeader;
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
        let sortedYears: string[] = [];
        if (this.sortOrder === '最新排序') {
            sortedYears = yearsArray.slice().reverse();
        } else {
            sortedYears = yearsArray;
        }

        return sortedYears.map(year => ({ tagName: `年份: ${year}` }));
    }

    private async getMarkdownFilesByTag(tag: string, folderPath: string): Promise<MarkdownFile[]> {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));

        const markdownFiles: MarkdownFile[] = [];

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);

            if (yamlHeader) {
                const yamlContent = yaml.load(yamlHeader[1]) as YamlHeader;
                if (yamlContent && yamlContent.date && yamlContent.title) {
                    const fileDate: Date = new Date(yamlContent.date);
                    const fileTags: string[] = yamlContent.tags || [];

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
            } else {
                return a.date.getTime() - b.date.getTime();
            }
        });

        return markdownFiles;
    }

    private async getMarkdownFilesByYear(year: number, folderPath: string): Promise<MarkdownFile[]> {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));

        const markdownFiles: MarkdownFile[] = [];

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const yamlHeader = content.match(/^---\n([\s\S]*?)\n---/);

            if (yamlHeader) {
                const yamlContent = yaml.load(yamlHeader[1]) as YamlHeader;
                if (yamlContent && yamlContent.date && yamlContent.title) {
                    const fileDate: Date = new Date(yamlContent.date);
                    if (fileDate.getFullYear() === year) {
                        const fileTags: string[] = yamlContent.tags || [];

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
            } else {
                return a.date.getTime() - b.date.getTime();
            }
        });

        return markdownFiles;
    }

    private isTagGroup(element: any): element is TagGroup {
        return (element as TagGroup).tagName !== undefined;
    }
}

export function deactivate() {}