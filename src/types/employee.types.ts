export interface Employee {
    user_key: string; // Used for UI key mainly
    id: string; // Sometimes this is used as key
    user_id: string; // The UUID
    username: string; // Email
    first_name: string;
    last_name: string;
    role: string;
    created_at: string;
    updated_at: string;
}
