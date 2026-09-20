"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiFetch } from "@/lib/api";

interface StaffOwner {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface PendingRestaurant {
  id: number;
  owner_id: number;
  name: string;
  slug: string;
  description?: string | null;
  cuisine_type?: string | null;
  price_range?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  state?: string | null;
  approved: boolean;
  is_active: boolean;
  rejection_reason?: string | null;
  created_at: string;
  owner?: StaffOwner | null;
}

interface ApprovalResponse {
  success: boolean;
  message?: string;
  data?: {
    pending_restaurants?: PendingRestaurant[];
    pending_restaurant_count?: number;
  };
}

export default function AdminApprovalsPage() {
  const [restaurants, setRestaurants] =
    useState<PendingRestaurant[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [selectedRestaurant, setSelectedRestaurant] =
    useState<PendingRestaurant | null>(null);

  const [actionLoading, setActionLoading] =
    useState<number | null>(null);

  const [rejecting, setRejecting] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const loadApprovals = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      setRefreshing(true);
      setError(null);

      try {
        const response =
          await apiFetch<ApprovalResponse>(
            "/admin/approvals",
            {
              method: "GET",
              cache: "no-store",
              headers: {
                Accept: "application/json",
              },
            },
          );

        if (!response.success) {
          throw new Error(
            response.message ||
              "Unable to load approvals.",
          );
        }

        setRestaurants(
          response.data
            ?.pending_restaurants ?? [],
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load approvals.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  const filteredRestaurants = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return restaurants;
    }

    return restaurants.filter(
      (restaurant) =>
        restaurant.name
          .toLowerCase()
          .includes(query) ||
        restaurant.city
          ?.toLowerCase()
          .includes(query) ||
        restaurant.owner?.name
          ?.toLowerCase()
          .includes(query) ||
        restaurant.owner?.email
          ?.toLowerCase()
          .includes(query),
    );
  }, [restaurants, search]);

  const approveRestaurant = async (
    restaurant: PendingRestaurant,
  ) => {
    if (actionLoading) {
      return;
    }

    setActionLoading(restaurant.id);
    setError(null);

    try {
      const response =
        await apiFetch<{
          success: boolean;
          message?: string;
        }>(
          `/admin/approvals/restaurants/${restaurant.id}/approve`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
            },
          },
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Unable to approve restaurant.",
        );
      }

      setRestaurants((current) =>
        current.filter(
          (item) =>
            item.id !== restaurant.id,
        ),
      );

      setSelectedRestaurant(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to approve restaurant.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const rejectRestaurant = async () => {
    if (
      !selectedRestaurant ||
      !rejectionReason.trim() ||
      actionLoading
    ) {
      return;
    }

    setActionLoading(
      selectedRestaurant.id,
    );

    try {
      const response =
        await apiFetch<{
          success: boolean;
          message?: string;
        }>(
          `/admin/approvals/restaurants/${selectedRestaurant.id}/reject`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              reason:
                rejectionReason.trim(),
            }),
          },
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Unable to reject restaurant.",
        );
      }

      setRestaurants((current) =>
        current.filter(
          (item) =>
            item.id !==
            selectedRestaurant.id,
        ),
      );

      setSelectedRestaurant(null);
      setRejecting(false);
      setRejectionReason("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reject restaurant.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f3] text-[#17211e]">
      <AdminSidebar />

      <main className="lg:pl-72">
        <div className="mx-auto max-w-[1700px] px-5 pb-16 pt-10 lg:px-8 xl:px-12">

          {/* HEADER */}
          <header className="mb-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-900/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#01261f]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
                  Admin Review Center
                </div>

                <h1 className="font-[Playfair_Display] text-4xl font-bold tracking-tight text-[#01261f] md:text-5xl">
                  Restaurant Approvals
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65706c]">
                  Review new restaurant applications and
                  activate the staff account associated with
                  each approved restaurant.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadApprovals(true)
                }
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#01261f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#174239] disabled:opacity-50"
              >
                <span
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                >
                  ↻
                </span>

                Refresh
              </button>
            </div>
          </header>

          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* STATS */}
          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e9e5e2] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7b8581]">
                Pending
              </p>

              <p className="mt-2 font-[Playfair_Display] text-4xl font-bold text-[#01261f]">
                {restaurants.length}
              </p>

              <p className="mt-1 text-xs text-[#7b8581]">
                Applications awaiting review
              </p>
            </div>

            <div className="rounded-2xl border border-[#e9e5e2] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7b8581]">
                Search Results
              </p>

              <p className="mt-2 font-[Playfair_Display] text-4xl font-bold text-[#01261f]">
                {filteredRestaurants.length}
              </p>

              <p className="mt-1 text-xs text-[#7b8581]">
                Applications currently visible
              </p>
            </div>

            <div className="rounded-2xl border border-[#e9e5e2] bg-[#01261f] p-5 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                Workflow
              </p>

              <p className="mt-2 text-lg font-bold">
                Review → Approve → Activate
              </p>

              <p className="mt-1 text-xs text-white/50">
                Approval activates both restaurant and staff.
              </p>
            </div>
          </section>

          {/* SEARCH */}
          <section className="mb-6 rounded-2xl border border-[#e9e5e2] bg-white p-4 shadow-sm">
            <div className="relative">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search restaurant, city, staff name or email..."
                className="w-full rounded-xl border border-[#e3dfdc] bg-[#faf9f8] px-4 py-3 text-sm outline-none transition focus:border-[#01261f] focus:ring-2 focus:ring-[#01261f]/10"
              />
            </div>
          </section>

          {/* CONTENT */}
          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {Array.from({
                length: 4,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-2xl bg-[#e8e4e1]"
                />
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfc9c5] bg-white p-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                ✓
              </div>

              <h2 className="mt-5 font-[Playfair_Display] text-2xl font-bold text-[#01261f]">
                No pending applications
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#727a77]">
                New restaurant registrations will appear here
                when staff submit them for administrator review.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredRestaurants.map(
                (restaurant) => (
                  <article
                    key={restaurant.id}
                    className="group overflow-hidden rounded-2xl border border-[#e7e2df] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {/* CARD HEADER */}
                    <div className="border-b border-[#eeeae7] bg-gradient-to-br from-[#01261f] to-[#174239] p-6 text-white">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                            Pending Review
                          </span>

                          <h2 className="mt-3 font-[Playfair_Display] text-2xl font-bold">
                            {restaurant.name}
                          </h2>

                          <p className="mt-1 text-sm text-white/50">
                            {restaurant.cuisine_type ||
                              "Restaurant"}{" "}
                            {restaurant.city
                              ? `• ${restaurant.city}`
                              : ""}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                          🍽
                        </div>
                      </div>
                    </div>

                    {/* CARD BODY */}
                    <div className="space-y-5 p-6">
                      {/* OWNER */}
                      <div className="rounded-xl bg-[#f7f5f3] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a928e]">
                          Submitted By
                        </p>

                        <p className="mt-1 font-semibold text-[#17211e]">
                          {restaurant.owner?.name ||
                            "Unknown staff"}
                        </p>

                        <p className="mt-1 text-sm text-[#68716d]">
                          {restaurant.owner?.email ||
                            "No email"}
                        </p>

                        {restaurant.owner?.phone && (
                          <p className="mt-1 text-xs text-[#89908d]">
                            {restaurant.owner.phone}
                          </p>
                        )}
                      </div>

                      {/* DETAILS */}
                      <div className="grid grid-cols-2 gap-3">
                        <Info
                          label="Address"
                          value={
                            restaurant.address ||
                            "Not provided"
                          }
                        />

                        <Info
                          label="Area"
                          value={
                            restaurant.area ||
                            restaurant.city ||
                            "Not provided"
                          }
                        />

                        <Info
                          label="Phone"
                          value={
                            restaurant.phone ||
                            "Not provided"
                          }
                        />

                        <Info
                          label="Price"
                          value={
                            restaurant.price_range ||
                            "Not specified"
                          }
                        />
                      </div>

                      {restaurant.description && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a928e]">
                            Description
                          </p>

                          <p className="mt-2 text-sm leading-6 text-[#59635f]">
                            {restaurant.description}
                          </p>
                        </div>
                      )}

                      {/* ACTIONS */}
                      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRestaurant(
                              restaurant,
                            )
                          }
                          className="flex-1 rounded-xl border border-[#ddd8d5] px-4 py-3 text-sm font-semibold text-[#36413d] transition hover:bg-[#f7f5f3]"
                        >
                          Review Details
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                            restaurant.id
                          }
                          onClick={() =>
                            void approveRestaurant(
                              restaurant,
                            )
                          }
                          className="flex-1 rounded-xl bg-[#01261f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#174239] disabled:opacity-50"
                        >
                          {actionLoading ===
                          restaurant.id
                            ? "Processing..."
                            : "Approve & Activate"}
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </div>
      </main>

      {/* DETAILS MODAL */}
      {selectedRestaurant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#eeeae7] bg-white px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Application Review
                </p>

                <h2 className="mt-1 font-[Playfair_Display] text-2xl font-bold text-[#01261f]">
                  {selectedRestaurant.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRestaurant(null);
                  setRejecting(false);
                  setRejectionReason("");
                }}
                className="rounded-full bg-[#f3f1ef] px-3 py-2 text-sm font-bold text-[#59635f]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info
                  label="Staff Name"
                  value={
                    selectedRestaurant.owner
                      ?.name || "Unknown"
                  }
                />

                <Info
                  label="Staff Email"
                  value={
                    selectedRestaurant.owner
                      ?.email || "Unknown"
                  }
                />

                <Info
                  label="Restaurant Email"
                  value={
                    selectedRestaurant.email ||
                    "Not provided"
                  }
                />

                <Info
                  label="Restaurant Phone"
                  value={
                    selectedRestaurant.phone ||
                    "Not provided"
                  }
                />

                <Info
                  label="Cuisine"
                  value={
                    selectedRestaurant.cuisine_type ||
                    "Not specified"
                  }
                />

                <Info
                  label="Price Range"
                  value={
                    selectedRestaurant.price_range ||
                    "Not specified"
                  }
                />

                <Info
                  label="City"
                  value={
                    selectedRestaurant.city ||
                    "Not provided"
                  }
                />

                <Info
                  label="Area"
                  value={
                    selectedRestaurant.area ||
                    "Not provided"
                  }
                />
              </div>

              <div className="rounded-2xl bg-[#f7f5f3] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#7c8581]">
                  Address
                </p>

                <p className="mt-2 text-sm leading-6 text-[#36413d]">
                  {selectedRestaurant.address ||
                    "No address provided."}
                </p>
              </div>

              {selectedRestaurant.description && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7c8581]">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#59635f]">
                    {selectedRestaurant.description}
                  </p>
                </div>
              )}

              {/* REJECTION */}
              {rejecting && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <label className="text-sm font-semibold text-red-900">
                    Reason for rejection
                  </label>

                  <textarea
                    value={rejectionReason}
                    onChange={(event) =>
                      setRejectionReason(
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Explain what needs to be corrected..."
                    className="mt-3 w-full resize-none rounded-xl border border-red-200 bg-white px-3 py-3 text-sm outline-none focus:border-red-400"
                  />

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(false);
                        setRejectionReason("");
                      }}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        !rejectionReason.trim() ||
                        actionLoading !== null
                      }
                      onClick={() =>
                        void rejectRestaurant()
                      }
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {actionLoading !== null
                        ? "Rejecting..."
                        : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}

              {!rejecting && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      setRejecting(true)
                    }
                    className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Reject Application
                  </button>

                  <button
                    type="button"
                    disabled={
                      actionLoading !== null
                    }
                    onClick={() =>
                      void approveRestaurant(
                        selectedRestaurant,
                      )
                    }
                    className="flex-1 rounded-xl bg-[#01261f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#174239] disabled:opacity-50"
                  >
                    {actionLoading !== null
                      ? "Processing..."
                      : "Approve & Activate"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#ebe7e4] bg-[#faf9f8] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a928e]">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-[#36413d]">
        {value}
      </p>
    </div>
  );
}