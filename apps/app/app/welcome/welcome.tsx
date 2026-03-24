import { useState, useEffect } from "react";
import { authClient } from "~/lib/auth";
import SignIn from "~/routes/signin";

export function Welcome() {
  const { data: session } = authClient.useSession();
  const [favorites, setFavorites] = useState<{id: number, airlineName: string}[]>([]);
  const [input, setInput] = useState("");


  const fetchFavorites = async () => {
    const res = await fetch("http://localhost:8787/favorites", {
      headers: { Authorization: `Bearer ${session?.session.token}` },
      credentials: "include", 
    });
    const data = await res.json();
    setFavorites(data);
  };


  const addFavorite = async () => {
    if (!input) return;
    await fetch("http://localhost:8787/favorites", {
      method: "POST",
      body: JSON.stringify({ airlineName: input }),
      headers: { "Content-Type": "application/json" },
      credentials: "include", 
    });
    setInput("");
    fetchFavorites();
  };

  useEffect(() => { if (session) fetchFavorites(); }, [session]);

  return (
    <main style={{ maxWidth: "300px", margin: "20px auto" }}>
      {session ? (
        <div>
          <h3>My Favorite Aviations</h3>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="CPA, AFR, etc." />
          <button onClick={addFavorite}>Add</button>

          <ul>
            {favorites?.map(f => (
              <li key={f.id}>{f.airlineName}</li>
            ))}
          </ul>
          
          <button onClick={() => authClient.signOut()}>Sign Out</button>
        </div>
      ) : (
        <SignIn/>
      )}
    </main>
  );
}