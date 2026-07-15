export function getDefaultStore(): CollectionStore {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[getDefaultStore]", {
    hasUrl: !!url,
    hasKey: !!serviceRoleKey,
    store: url && serviceRoleKey ? "supabase" : "fs",
  });

  cached =
    url && serviceRoleKey
      ? createSupabaseStore(url, serviceRoleKey)
      : createFsStore();

  return cached;
}