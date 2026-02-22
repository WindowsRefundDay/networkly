
import { User } from "@supabase/supabase-js"

export const MOCK_USER: User = {
    id: "694725fa-304c-41e4-8015-8e74091a2226",
    email: "joeljmanuel@gmail.com",
    app_metadata: {},
    user_metadata: {
        full_name: "Joel Manuel (Dev Mode)",
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
}

export function isDev() {
    return process.env.NODE_ENV === "development"
}
