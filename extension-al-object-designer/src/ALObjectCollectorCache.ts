import * as path from 'path';
import * as utils from './utils';
import { ALObjectDesigner } from "./ALModules";
import CollectorItem = ALObjectDesigner.CollectorItem;
import ObjectCollectorCacheInfo = ALObjectDesigner.ObjectCollectorCacheInfo;
import { extensions, workspace } from 'vscode';
const fs = require('fs-extra');
const hash = require('hash.js');
const semver = require('semver');

export class ALObjectCollectorCache implements ALObjectDesigner.ObjectCollectorCache {

    private _vsSettings: any;

    constructor() {
        this._vsSettings = utils.getVsConfig();
    }

    async clearCache() {
        let root = (workspace as any).workspaceFolders[0];
        let fPath = path.join(root.uri.fsPath, '.vscode', '.alcache', path.sep);
        await fs.remove(fPath);
    }

    async isCached(filepath: string, tagName?: string) {
        // remove old cache folder: as of v0.2.0
        let root = (workspace as any).workspaceFolders[0];
        let oldPath = path.join(root.uri.fsPath, '.alcache', path.sep);
        if (await utils.folderExists(oldPath)) {
            await fs.remove(oldPath);
        }

        let cache = await this.getCacheInfo(filepath, tagName);
        let stat = await fs.stat(filepath);
        let mtime = stat.mtime.getTime();

        let cacheWasChangedInVersion: string = '0.2.4';
        if (!cache.content.CreatedwithVersion || semver.gte(cacheWasChangedInVersion, cache.content.CreatedwithVersion)) {
            await this.clearCache();
            cache.invalid = true;
        }
        return cache.invalid === false && mtime <= cache.content.Timestamp;
    }

    async setCache(filepath: string, data: Array<CollectorItem>, tagName?: string) {
        let cache = await this.getCacheInfo(filepath, tagName);
        let stat = await fs.stat(filepath);

        let row: ObjectCollectorCacheInfo = cache.content;
        row.Timestamp = stat.mtime.getTime();
        row.Items = data;
        row.CreatedwithVersion = extensions.getExtension('martonsagi.al-object-designer')?.packageJSON.version;

        await fs.writeJson(cache.path, row);
    }

    async getCache(filepath: string, tagName?: string): Promise<ObjectCollectorCacheInfo> {
        let cache = await this.getCacheInfo(filepath, tagName);
        let row = cache.content;

        return row;
    }

    async getCacheInfo(filepath: string, tagName?: string) {
        let root = (workspace as any).workspaceFolders[0];
        let fPath = path.join(root.uri.fsPath, '.vscode', '.alcache', path.sep);
        let fileHash = hash.sha256().update(filepath + (this._vsSettings.showStandardEvents === true ? 1 : 0)).digest('hex');
        let jsonFile = path.join(fPath, `cache_${fileHash}${tagName || ''}.json`);
        let cacheInfo: ObjectCollectorCacheInfo = new ObjectCollectorCacheInfo();
        let isInvalid = false;

        try {
            if ((await fs.pathExists(jsonFile)) == false) {
                await fs.ensureFile(jsonFile);
                let content = new ObjectCollectorCacheInfo();
                await fs.writeJson(jsonFile, content);
                isInvalid = true;
            }
            cacheInfo = (await fs.readJson(jsonFile)) as ObjectCollectorCacheInfo;
        } catch (err) {
            console.error(err);
        }

        return {
            path: jsonFile,
            content: cacheInfo,
            invalid: isInvalid
        };
    }

}