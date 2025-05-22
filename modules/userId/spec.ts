
export type UserIdProvider = string;

export interface UserId {
    [idName: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProvidersToId {
    /**
     * Map from ID provider name to the key they provide in .userId.
     */
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProviderParams {
    /**
     * Map from ID provider name to the type of their configuration params.
     */
}
