
import { apiFetch } from "./api";

export type UserRole = "diner" | "staff" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

interface LoginResponse {
  success?: boolean;
  message?: string;

  data: {
    access_token: string;
    token_type?: string;
    expires_in?: number;

    user: {
      id: number;
      name: string;
      email: string;
      role?: UserRole;
    };

    /*
     * AuthController also returns the role directly.
     */
    role?: UserRole;
  };
}

/**
 * Login user.
 */
export const login = async (
  email: string,
  password: string
): Promise<User> => {
  const response = await apiFetch<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  /*
   * Get JWT token.
   */
  const token = response?.data?.access_token;

  if (!token) {
    throw new Error(
      "Login succeeded but no authentication token was returned."
    );
  }

  /*
   * Get user returned by Laravel.
   */
  const backendUser = response?.data?.user;

  if (!backendUser) {
    throw new Error(
      "Login succeeded but no user information was returned."
    );
  }

  /*
   * IMPORTANT:
   *
   * Laravel AuthController returns:
   *
   * data.role
   *
   * and:
   *
   * data.user.role
   *
   * Use data.role first, then fall back to user.role.
   */
  const role =
    response.data.role ?? backendUser.role;

  /*
   * Make sure Laravel returned a valid role.
   */
  if (
    role !== "diner" &&
    role !== "staff" &&
    role !== "admin"
  ) {
    console.error(
      "Invalid role returned from Laravel:",
      response.data
    );

    throw new Error(
      "The server did not return a valid user role."
    );
  }

  /*
   * Create the final frontend user.
   */
  const user: User = {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    role: role,
  };

  /*
   * Save JWT.
   */
  localStorage.setItem("token", token);

  /*
   * Save user INCLUDING role.
   */
  localStorage.setItem(
    "user",
    JSON.stringify(user)
  );

  /*
   * Debug information.
   *
   * You should see:
   * LOGIN ROLE: staff
   */
  console.log("LOGIN USER:", user);
  console.log("LOGIN ROLE:", user.role);

  return user;
};

/**
 * Register a new user.
 */
export const register = async (
  name: string,
  email: string,
  password: string,
  role: string
) => {
  const response = await apiFetch(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password,
        role,
      }),
    }
  );

  return response;
};

/**
 * Logout current user.
 */
export const logout = async () => {
  try {
    await apiFetch("/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    console.error(
      "Logout request failed:",
      error
    );
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
};

/**
 * Get JWT token.
 */
export const getToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("token");
};

/**
 * Get currently logged-in user.
 */
export const getUser = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser =
    localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(
      storedUser
    ) as User;

    /*
     * Validate stored user.
     */
    if (
      !user.id ||
      !user.email ||
      !user.role
    ) {
      localStorage.removeItem("user");
      return null;
    }

    /*
     * Validate role.
     */
    if (
      user.role !== "diner" &&
      user.role !== "staff" &&
      user.role !== "admin"
    ) {
      localStorage.removeItem("user");
      return null;
    }

    return user;
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error
    );

    localStorage.removeItem("user");

    return null;
  }
};

/**
 * Check authentication.
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * Check admin role.
 */
export const isAdmin = (): boolean => {
  const user = getUser();

  return user?.role === "admin";
};

/**
 * Check staff role.
 *
 * Admin is also allowed to access staff-level
 * areas where the application permits it.
 */
export const isStaff = (): boolean => {
  const user = getUser();

  return (
    user?.role === "staff" ||
    user?.role === "admin"
  );
};
