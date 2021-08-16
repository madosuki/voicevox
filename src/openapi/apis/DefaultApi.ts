/* tslint:disable */
/* eslint-disable */
/**
 * VOICEVOX ENGINE
 * VOICEVOXの音声合成エンジンです。
 *
 * The version of the OpenAPI document: 0.3.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import {
    AccentPhrase,
    AccentPhraseFromJSON,
    AccentPhraseToJSON,
    AudioQuery,
    AudioQueryFromJSON,
    AudioQueryToJSON,
    HTTPValidationError,
    HTTPValidationErrorFromJSON,
    HTTPValidationErrorToJSON,
} from '../models';

export interface AccentPhrasesAccentPhrasesPostRequest {
    text: string;
    speaker: number;
}

export interface AudioQueryAudioQueryPostRequest {
    text: string;
    speaker: number;
}

export interface MoraPitchMoraPitchPostRequest {
    speaker: number;
    accentPhrase: Array<AccentPhrase>;
}

export interface SynthesisSynthesisPostRequest {
    speaker: number;
    audioQuery: AudioQuery;
}

/**
 * DefaultApi - interface
 * 
 * @export
 * @interface DefaultApiInterface
 */
export interface DefaultApiInterface {
    /**
     * 
     * @summary テキストからアクセント句を得る
     * @param {string} text 
     * @param {number} speaker 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApiInterface
     */
    accentPhrasesAccentPhrasesPostRaw(requestParameters: AccentPhrasesAccentPhrasesPostRequest): Promise<runtime.ApiResponse<Array<AccentPhrase>>>;

    /**
     * テキストからアクセント句を得る
     */
    accentPhrasesAccentPhrasesPost(requestParameters: AccentPhrasesAccentPhrasesPostRequest): Promise<Array<AccentPhrase>>;

    /**
     * クエリの初期値を得ます。ここで得られたクエリはそのまま音声合成に利用できます。各値の意味は`Schemas`を参照してください。
     * @summary 音声合成用のクエリを作成する
     * @param {string} text 
     * @param {number} speaker 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApiInterface
     */
    audioQueryAudioQueryPostRaw(requestParameters: AudioQueryAudioQueryPostRequest): Promise<runtime.ApiResponse<AudioQuery>>;

    /**
     * クエリの初期値を得ます。ここで得られたクエリはそのまま音声合成に利用できます。各値の意味は`Schemas`を参照してください。
     * 音声合成用のクエリを作成する
     */
    audioQueryAudioQueryPost(requestParameters: AudioQueryAudioQueryPostRequest): Promise<AudioQuery>;

    /**
     * 
     * @summary アクセント句から音高を得る
     * @param {number} speaker 
     * @param {Array<AccentPhrase>} accentPhrase 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApiInterface
     */
    moraPitchMoraPitchPostRaw(requestParameters: MoraPitchMoraPitchPostRequest): Promise<runtime.ApiResponse<Array<AccentPhrase>>>;

    /**
     * アクセント句から音高を得る
     */
    moraPitchMoraPitchPost(requestParameters: MoraPitchMoraPitchPostRequest): Promise<Array<AccentPhrase>>;

    /**
     * 
     * @summary 音声合成する
     * @param {number} speaker 
     * @param {AudioQuery} audioQuery 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApiInterface
     */
    synthesisSynthesisPostRaw(requestParameters: SynthesisSynthesisPostRequest): Promise<runtime.ApiResponse<Blob>>;

    /**
     * 音声合成する
     */
    synthesisSynthesisPost(requestParameters: SynthesisSynthesisPostRequest): Promise<Blob>;

    /**
     * 
     * @summary Version
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApiInterface
     */
    versionVersionGetRaw(): Promise<runtime.ApiResponse<any>>;

    /**
     * Version
     */
    versionVersionGet(): Promise<any>;

}

/**
 * 
 */
export class DefaultApi extends runtime.BaseAPI implements DefaultApiInterface {

    /**
     * テキストからアクセント句を得る
     */
    async accentPhrasesAccentPhrasesPostRaw(requestParameters: AccentPhrasesAccentPhrasesPostRequest): Promise<runtime.ApiResponse<Array<AccentPhrase>>> {
        if (requestParameters.text === null || requestParameters.text === undefined) {
            throw new runtime.RequiredError('text','Required parameter requestParameters.text was null or undefined when calling accentPhrasesAccentPhrasesPost.');
        }

        if (requestParameters.speaker === null || requestParameters.speaker === undefined) {
            throw new runtime.RequiredError('speaker','Required parameter requestParameters.speaker was null or undefined when calling accentPhrasesAccentPhrasesPost.');
        }

        const queryParameters: any = {};

        if (requestParameters.text !== undefined) {
            queryParameters['text'] = requestParameters.text;
        }

        if (requestParameters.speaker !== undefined) {
            queryParameters['speaker'] = requestParameters.speaker;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/accent_phrases`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        });

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(AccentPhraseFromJSON));
    }

    /**
     * テキストからアクセント句を得る
     */
    async accentPhrasesAccentPhrasesPost(requestParameters: AccentPhrasesAccentPhrasesPostRequest): Promise<Array<AccentPhrase>> {
        const response = await this.accentPhrasesAccentPhrasesPostRaw(requestParameters);
        return await response.value();
    }

    /**
     * クエリの初期値を得ます。ここで得られたクエリはそのまま音声合成に利用できます。各値の意味は`Schemas`を参照してください。
     * 音声合成用のクエリを作成する
     */
    async audioQueryAudioQueryPostRaw(requestParameters: AudioQueryAudioQueryPostRequest): Promise<runtime.ApiResponse<AudioQuery>> {
        if (requestParameters.text === null || requestParameters.text === undefined) {
            throw new runtime.RequiredError('text','Required parameter requestParameters.text was null or undefined when calling audioQueryAudioQueryPost.');
        }

        if (requestParameters.speaker === null || requestParameters.speaker === undefined) {
            throw new runtime.RequiredError('speaker','Required parameter requestParameters.speaker was null or undefined when calling audioQueryAudioQueryPost.');
        }

        const queryParameters: any = {};

        if (requestParameters.text !== undefined) {
            queryParameters['text'] = requestParameters.text;
        }

        if (requestParameters.speaker !== undefined) {
            queryParameters['speaker'] = requestParameters.speaker;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/audio_query`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        });

        return new runtime.JSONApiResponse(response, (jsonValue) => AudioQueryFromJSON(jsonValue));
    }

    /**
     * クエリの初期値を得ます。ここで得られたクエリはそのまま音声合成に利用できます。各値の意味は`Schemas`を参照してください。
     * 音声合成用のクエリを作成する
     */
    async audioQueryAudioQueryPost(requestParameters: AudioQueryAudioQueryPostRequest): Promise<AudioQuery> {
        const response = await this.audioQueryAudioQueryPostRaw(requestParameters);
        return await response.value();
    }

    /**
     * アクセント句から音高を得る
     */
    async moraPitchMoraPitchPostRaw(requestParameters: MoraPitchMoraPitchPostRequest): Promise<runtime.ApiResponse<Array<AccentPhrase>>> {
        if (requestParameters.speaker === null || requestParameters.speaker === undefined) {
            throw new runtime.RequiredError('speaker','Required parameter requestParameters.speaker was null or undefined when calling moraPitchMoraPitchPost.');
        }

        if (requestParameters.accentPhrase === null || requestParameters.accentPhrase === undefined) {
            throw new runtime.RequiredError('accentPhrase','Required parameter requestParameters.accentPhrase was null or undefined when calling moraPitchMoraPitchPost.');
        }

        const queryParameters: any = {};

        if (requestParameters.speaker !== undefined) {
            queryParameters['speaker'] = requestParameters.speaker;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/mora_pitch`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: requestParameters.accentPhrase.map(AccentPhraseToJSON),
        });

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(AccentPhraseFromJSON));
    }

    /**
     * アクセント句から音高を得る
     */
    async moraPitchMoraPitchPost(requestParameters: MoraPitchMoraPitchPostRequest): Promise<Array<AccentPhrase>> {
        const response = await this.moraPitchMoraPitchPostRaw(requestParameters);
        return await response.value();
    }

    /**
     * 音声合成する
     */
    async synthesisSynthesisPostRaw(requestParameters: SynthesisSynthesisPostRequest): Promise<runtime.ApiResponse<Blob>> {
        if (requestParameters.speaker === null || requestParameters.speaker === undefined) {
            throw new runtime.RequiredError('speaker','Required parameter requestParameters.speaker was null or undefined when calling synthesisSynthesisPost.');
        }

        if (requestParameters.audioQuery === null || requestParameters.audioQuery === undefined) {
            throw new runtime.RequiredError('audioQuery','Required parameter requestParameters.audioQuery was null or undefined when calling synthesisSynthesisPost.');
        }

        const queryParameters: any = {};

        if (requestParameters.speaker !== undefined) {
            queryParameters['speaker'] = requestParameters.speaker;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/synthesis`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: AudioQueryToJSON(requestParameters.audioQuery),
        });

        return new runtime.BlobApiResponse(response);
    }

    /**
     * 音声合成する
     */
    async synthesisSynthesisPost(requestParameters: SynthesisSynthesisPostRequest): Promise<Blob> {
        const response = await this.synthesisSynthesisPostRaw(requestParameters);
        return await response.value();
    }

    /**
     * Version
     */
    async versionVersionGetRaw(): Promise<runtime.ApiResponse<any>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/version`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        });

        return new runtime.TextApiResponse(response) as any;
    }

    /**
     * Version
     */
    async versionVersionGet(): Promise<any> {
        const response = await this.versionVersionGetRaw();
        return await response.value();
    }

}
