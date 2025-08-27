import { useEffect, useState } from "react";
import { getUserRole } from "../utils/getUserRole";

export default function useRole() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const r = await getUserRole();
      setRole(r);
      setLoading(false);
    };
    load();
  }, []);

  return { role, loading };
}
