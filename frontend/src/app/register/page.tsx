"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiMapPin,
  FiPhone,
  FiGlobe,
  FiHome,
  FiBriefcase,
  FiCheckCircle,
} from "react-icons/fi";

import { register } from "@/lib/auth";

type RegistrationRole = "diner" | "staff";

interface RestaurantForm {
  name: string;
  description: string;
  cuisine_type: string;
  price_range: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  area: string;
  state: string;
}

const initialRestaurant: RestaurantForm = {
  name: "",
  description: "",
  cuisine_type: "",
  price_range: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  city: "",
  area: "",
  state: "",
};

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [role, setRole] =
    useState<RegistrationRole>("diner");

  const [restaurant, setRestaurant] =
    useState<RestaurantForm>(initialRestaurant);

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [error, setError] = useState("");

  const updateRestaurant = (
    field: keyof RestaurantForm,
    value: string,
  ) => {
    setRestaurant((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRoleChange = (
    newRole: RegistrationRole,
  ) => {
    setRole(newRole);
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (role === "staff") {
      if (!restaurant.name.trim()) {
        setError(
          "Please enter your restaurant name.",
        );
        return;
      }

      if (!restaurant.address.trim()) {
        setError(
          "Please enter your restaurant address.",
        );
        return;
      }

      if (!restaurant.city.trim()) {
        setError(
          "Please enter your restaurant city.",
        );
        return;
      }
    }

    setLoading(true);

    try {
      await register(
        name.trim(),
        email.trim(),
        password,
        role,

        /*
         * No restaurant ID anymore.
         */
        null,

        confirmPassword,

        /*
         * New restaurant payload.
         */
        role === "staff"
          ? restaurant
          : undefined,
      );

      /*
       * Staff registrations need to see a
       * pending approval message.
       */
      if (role === "staff") {
        router.push(
          "/login?registered=staff-pending",
        );
      } else {
        router.push(
          "/login?registered=true",
        );
      }
    } catch (err: any) {
      console.error(
        "Registration error:",
        err,
      );

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061512] px-4 py-10 text-white">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1d19] shadow-2xl lg:grid-cols-[0.8fr_1.2fr]">

        {/* LEFT PANEL */}
        <div className="relative hidden overflow-hidden bg-[#01261f] p-10 lg:block">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#cba72f]/10 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <FiBriefcase className="text-emerald-300" size={22} />
              </div>

              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                ReserveEase
              </p>

              <h1 className="font-[Playfair_Display] text-5xl font-bold leading-tight">
                Bring your restaurant
                <span className="text-emerald-300">
                  {" "}to ReserveEase.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-sm leading-7 text-white/60">
                Restaurant staff can submit their restaurant
                during registration. Our administrators review
                the application before the restaurant and staff
                account become active.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Create your staff account",
                "Submit your restaurant information",
                "Wait for administrator approval",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-sm font-bold text-emerald-300">
                    {index + 1}
                  </div>

                  <span className="text-sm text-white/80">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                Create Account
              </p>

              <h2 className="mt-2 font-[Playfair_Display] text-3xl font-bold">
                Welcome to ReserveEase
              </h2>

              <p className="mt-2 text-sm text-white/50">
                Create your account and get started.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* ACCOUNT */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-5">
                  <h3 className="font-semibold">
                    Account Information
                  </h3>

                  <p className="mt-1 text-xs text-white/40">
                    Your personal account details.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* NAME */}
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Full Name
                    </label>

                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />

                      <input
                        value={name}
                        onChange={(e) =>
                          setName(e.target.value)
                        }
                        required
                        autoComplete="name"
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Email
                    </label>

                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value)
                        }
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                      />
                    </div>
                  </div>

                  {/* PASSWORDS */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Password
                      </label>

                      <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />

                        <input
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          value={password}
                          onChange={(e) =>
                            setPassword(
                              e.target.value,
                            )
                          }
                          required
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-500/60"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(
                              (value) => !value,
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                        >
                          {showPassword ? (
                            <FiEyeOff />
                          ) : (
                            <FiEye />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Confirm Password
                      </label>

                      <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />

                        <input
                          type={
                            showConfirmPassword
                              ? "text"
                              : "password"
                          }
                          value={confirmPassword}
                          onChange={(e) =>
                            setConfirmPassword(
                              e.target.value,
                            )
                          }
                          required
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-500/60"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(
                              (value) => !value,
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                        >
                          {showConfirmPassword ? (
                            <FiEyeOff />
                          ) : (
                            <FiEye />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROLE */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold">
                  Account Type
                </h3>

                <p className="mt-1 text-xs text-white/40">
                  Choose how you will use ReserveEase.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleRoleChange("diner")
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      role === "diner"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10 bg-black/10 hover:border-white/20"
                    }`}
                  >
                    <p className="font-semibold">
                      Diner
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      Discover and reserve restaurants.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleRoleChange("staff")
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      role === "staff"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10 bg-black/10 hover:border-white/20"
                    }`}
                  >
                    <p className="font-semibold">
                      Restaurant Staff
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      Register and manage your restaurant.
                    </p>
                  </button>
                </div>
              </div>

              {/* RESTAURANT */}
              {role === "staff" && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                        <FiHome />
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          Restaurant Information
                        </h3>

                        <p className="text-xs text-white/40">
                          This restaurant will be reviewed by an administrator.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* RESTAURANT NAME */}
                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Restaurant Name *
                      </label>

                      <input
                        value={restaurant.name}
                        onChange={(e) =>
                          updateRestaurant(
                            "name",
                            e.target.value,
                          )
                        }
                        required
                        placeholder="Example Restaurant"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Description
                      </label>

                      <textarea
                        value={restaurant.description}
                        onChange={(e) =>
                          updateRestaurant(
                            "description",
                            e.target.value,
                          )
                        }
                        rows={3}
                        placeholder="Tell us about your restaurant..."
                        className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    {/* CUISINE + PRICE */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          Cuisine Type
                        </label>

                        <input
                          value={
                            restaurant.cuisine_type
                          }
                          onChange={(e) =>
                            updateRestaurant(
                              "cuisine_type",
                              e.target.value,
                            )
                          }
                          placeholder="Ethiopian, Italian..."
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-emerald-500/60"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          Price Range
                        </label>

                        <select
                          value={
                            restaurant.price_range
                          }
                          onChange={(e) =>
                            updateRestaurant(
                              "price_range",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#101f1c] px-3 py-3 text-sm outline-none focus:border-emerald-500/60"
                        >
                          <option value="">
                            Select price range
                          </option>
                          <option value="$">
                            $
                          </option>
                          <option value="$$">
                            $$
                          </option>
                          <option value="$$$">
                            $$$
                          </option>
                          <option value="$$$$">
                            $$$$
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* CONTACT */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          Restaurant Phone
                        </label>

                        <div className="relative">
                          <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />

                          <input
                            value={
                              restaurant.phone
                            }
                            onChange={(e) =>
                              updateRestaurant(
                                "phone",
                                e.target.value,
                              )
                            }
                            placeholder="+251..."
                            className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-500/60"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          Restaurant Email
                        </label>

                        <div className="relative">
                          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />

                          <input
                            type="email"
                            value={
                              restaurant.email
                            }
                            onChange={(e) =>
                              updateRestaurant(
                                "email",
                                e.target.value,
                              )
                            }
                            placeholder="restaurant@example.com"
                            className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-500/60"
                          />
                        </div>
                      </div>
                    </div>

                    {/* WEBSITE */}
                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Website
                      </label>

                      <div className="relative">
                        <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />

                        <input
                          value={
                            restaurant.website
                          }
                          onChange={(e) =>
                            updateRestaurant(
                              "website",
                              e.target.value,
                            )
                          }
                          placeholder="https://example.com"
                          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-500/60"
                        />
                      </div>
                    </div>

                    {/* ADDRESS */}
                    <div>
                      <label className="mb-2 block text-sm text-white/60">
                        Address *
                      </label>

                      <div className="relative">
                        <FiMapPin className="absolute left-3 top-3.5 text-white/30" />

                        <textarea
                          value={
                            restaurant.address
                          }
                          onChange={(e) =>
                            updateRestaurant(
                              "address",
                              e.target.value,
                            )
                          }
                          required
                          rows={2}
                          placeholder="Street address"
                          className="w-full resize-none rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-500/60"
                        />
                      </div>
                    </div>

                    {/* LOCATION */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          City *
                        </label>

                        <input
                          value={restaurant.city}
                          onChange={(e) =>
                            updateRestaurant(
                              "city",
                              e.target.value,
                            )
                          }
                          required
                          placeholder="Addis Ababa"
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-emerald-500/60"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          Area
                        </label>

                        <input
                          value={restaurant.area}
                          onChange={(e) =>
                            updateRestaurant(
                              "area",
                              e.target.value,
                            )
                          }
                          placeholder="Bole"
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-emerald-500/60"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          State
                        </label>

                        <input
                          value={restaurant.state}
                          onChange={(e) =>
                            updateRestaurant(
                              "state",
                              e.target.value,
                            )
                          }
                          placeholder="Addis Ababa"
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-emerald-500/60"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <FiCheckCircle className="mt-0.5 shrink-0 text-amber-300" />

                    <p className="text-xs leading-5 text-white/50">
                      Your restaurant will not become publicly
                      available immediately. An administrator must
                      review and approve the application first.
                    </p>
                  </div>
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-500 py-3.5 font-semibold text-[#01261f] shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Submitting..."
                  : role === "staff"
                    ? "Submit Restaurant for Approval"
                    : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/40">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}