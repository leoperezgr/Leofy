export async function validateSession() {
  const token = localStorage.getItem("leofy_token");
  if (!token) return false;

  try {
    const res = await fetch("http://localhost:4000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Invalid session");

    return true;
  } catch {
    localStorage.removeItem("leofy_token");
    localStorage.removeItem("leofy_user");
    return false;
  }
}