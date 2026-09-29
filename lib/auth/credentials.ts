type AuthError = { message: string; code?: string } | null;

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
      options?: { data?: { full_name?: string; officer_registration?: "true" } };
    }) => Promise<{
      data: { user: { id: string; identities?: unknown[] } | null; session: unknown };
      error: AuthError;
    }>;
    signOut: () => Promise<{ error: AuthError }>;
  };
};

export type CredentialResult =
  | { ok: true; userId: string; needsEmailConfirmation?: boolean }
  | {
      ok: false;
      code: "invalid_credentials" | "signup_failed" | "user_already_exists";
      message?: string;
    };

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
    const isDuplicate =
      error?.code === "user_already_exists" ||
      error?.message?.toLowerCase().includes("already registered");
    if (isDuplicate) {
      return {
        ok: false,
        code: "user_already_exists",
        message: "An account with this email already exists. Please sign in.",
      };
    }
    return {
      ok: false,
      code: "signup_failed",
      message: error?.message || "Account could not be created.",
    };
  }

  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      ok: false,
      code: "user_already_exists",
      message: "An account with this email already exists. Please sign in.",
    };
  }

  return {
    ok: true,
    userId: data.user.id,
    needsEmailConfirmation: data.session === null,
  };
}

/**
 * Creates an applicant and a pending officer registration.
 * Auth metadata records the request only. It never assigns an officer account
 * or a department. An administrator activates the request later.
 */
export async function registerOfficerRegistration(
  client: PasswordAuthClient,
  input: { email: string; password: string; fullName: string },
): Promise<CredentialResult> {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        officer_registration: "true",
      },
    },
  });

  if (error || !data.user) {
    const isDuplicate =
      error?.code === "user_already_exists" ||
      error?.message?.toLowerCase().includes("already registered");
    if (isDuplicate) {
      return {
        ok: false,
        code: "user_already_exists",
        message: "An account with this email already exists. Please sign in.",
      };
    }
    return {
      ok: false,
      code: "signup_failed",
      message: error?.message || "Account could not be created.",
    };
  }

  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      ok: false,
      code: "user_already_exists",
      message: "An account with this email already exists. Please sign in.",
    };
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
