const fs = require("fs")
const path = require("path");
const vscode = require("vscode");
const { executeCommand } = vscode.commands

const utils = require("./utils.js");

const CONFIG_PATH = path.resolve(vscode.workspace.rootPath, ".vscode", "pinned-files.json")

class PinnedItem {
    constructor(uri, type) {
        this.uri = uri;
        this.type = type;
    }
}

class PinDataProvider {

    _pinnedList = [];

    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() {
        if (!fs.existsSync(CONFIG_PATH)) {
            return;
        }
        let config = fs.readFileSync(CONFIG_PATH).toString();
        try {
            config = JSON.parse(config);
        } catch (e) {
            return;
        }
        for (let i in config) {
            this.AddPin({path:config[i]}, true);
        }
        this.refresh();
    }
    
    getChildren(element) {
        if (!element) {
            return this._pinnedList.map(filepath => {
                let isDir = fs.statSync(filepath).isDirectory();
                let uri = vscode.Uri.file(filepath);
                return new PinnedItem(uri, isDir ? vscode.FileType.Directory : vscode.FileType.File);
            });
        } else {
            let dirs = fs.readdirSync(utils.fixedPath(element.uri.path), { withFileTypes: true });
            return dirs.map(fileItem => {
                let filepath = path.resolve(utils.fixedPath(element.uri.path), fileItem.name)
                let isDir = fileItem.isDirectory();
                return new PinnedItem(
                    vscode.Uri.file(filepath),
                    isDir ? vscode.FileType.Directory : vscode.FileType.File
                )
            })
        }
    }

    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(element.uri, element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        if (element.type === vscode.FileType.File) {
			treeItem.command = { command: 'pin-up.open-resource-uri', title: "Open File", arguments: [element.uri], };
			treeItem.contextValue = 'file';
        }
        return treeItem;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
        if (this._pinnedList.length) {
            executeCommand("setContext", "pin-up-have-pinned-files", true);
            let configDir = path.dirname(CONFIG_PATH);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir);
            }
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(this._pinnedList));
        } else {
            if (fs.existsSync(CONFIG_PATH)) {
                fs.unlinkSync(CONFIG_PATH);
            }
            executeCommand("setContext", "pin-up-have-pinned-files", false);
        }
    }

    /******* Commands *******/
    
    AddPin(file, nofresh) {

        let filepath = utils.fixedPath(file.path);
        
        if (!filepath || this._pinnedList.indexOf(filepath) != -1) {
            return
        }

        this._pinnedList.push(filepath);

        if (!nofresh) {
            this.refresh()
        }
    }

    RemovePin(element) {
        let index = this._pinnedList.indexOf(element.uri.path);
        this._pinnedList.splice(index, 1);
        this.refresh();
    }

    ClearPin() {
        this._pinnedList = [];
        if (fs.existsSync(CONFIG_PATH)) {
            fs.unlinkSync(CONFIG_PATH);
        }
        this.refresh();
    }
}

module.exports = PinDataProvider;