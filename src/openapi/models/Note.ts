/* tslint:disable */
/* eslint-disable */
/**
 * VOICEVOX ENGINE OSS
 * VOICEVOX OSS の音声合成エンジンです。
 *
 * The version of the OpenAPI document: latest
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
/**
 * 音符ごとの情報。
 * @export
 * @interface Note
 */
export interface Note {
    /**
     * 
     * @type {string}
     * @memberof Note
     */
    id?: string | null;
    /**
     * 音階
     * @type {number}
     * @memberof Note
     */
    key?: number;
    /**
     * 音符のフレーム長
     * @type {number}
     * @memberof Note
     */
    frameLength: number;
    /**
     * 音符の歌詞
     * @type {string}
     * @memberof Note
     */
    lyric: string;
}

/**
 * Check if a given object implements the Note interface.
 */
export function instanceOfNote(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "frameLength" in value;
    isInstance = isInstance && "lyric" in value;

    return isInstance;
}

export function NoteFromJSON(json: any): Note {
    return NoteFromJSONTyped(json, false);
}

export function NoteFromJSONTyped(json: any, ignoreDiscriminator: boolean): Note {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'id': !exists(json, 'id') ? undefined : json['id'],
        'key': !exists(json, 'key') ? undefined : json['key'],
        'frameLength': json['frame_length'],
        'lyric': json['lyric'],
    };
}

export function NoteToJSON(value?: Note | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'id': value.id,
        'key': value.key,
        'frame_length': value.frameLength,
        'lyric': value.lyric,
    };
}

