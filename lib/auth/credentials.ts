type AuthError = { message: string } | null;

export type PasswordAuthClient = {
  auth: {
    signInWithPassword: (credentials: {
      email: string;
      password: string;
    }) => Promise<{
      data: { user: { id: string } | null };
      error: AuthError;
    }>;
    signUp: (credentials: {
      email: string;
      password: string;
      options?: { data?: { full_name?: string } };
    }) => Promise<{
      data: { user: { id: string } | null; session: unknown };
      error: AuthError;
    }>;
    signOut: () => Promise<{ error: AuthError }>;
  };
};

export type CredentialResult =
  | { ok: true; userId: string; needsEmailConfirmation?: boolean }
  | { ok: false; code: "invalid_credentials" | "signup_failed" };

export async function signInWithPassword(
  client: PasswordAuthClient,
  email: string,
  password: string,
): Promise<CredentialResult> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { ok: false, code: "invalid_credentials" };
  }
  return { ok: true, userId: data.user.id };
}

/**
 * Creates an applicant. The auth metadata never includes a role.
 * The database trigger assigns `applicant` and ignores any client role.
 */
export async function registerApplicant(
  client: PasswordAuthClient,
  input: { email: string; password: string; fullName: string },
): Promise<CredentialResult> {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
      },
    },
  });

  if (error || !data.user) {
    return { ok: false, code: "signup_failed" };
  }

  return {
    ok: true,
    userId: data.user.id,
    needsEmailConfirmation: data.session === null,
  };
}

export async function signOut(client: PasswordAuthClient): Promise<void> {
  await client.auth.signOut();
}
