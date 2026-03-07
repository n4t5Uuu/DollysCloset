/**
 * Delineates standard database return blocks tied exclusively against `tbl_users` entities restricted via explicit permissions inherently.
 */
export interface Employee {
    user_key: string;
    id: string;
    user_id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    created_at: string;
    updated_at: string;
}
