import SignIn from "~/routes/signin";
import { authClient } from "~/lib/auth";

export function Welcome() {
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
        },
      },
    });
  };

  if (isPending) return <div style={{ maxWidth: "300px", margin: "20px auto" }}>Loading...</div>;

  return (
    <main style={{ maxWidth: "300px", margin: "20px auto" }}>
      {session ? (
        <div>
          <p>Hi {session.user.name}! You're logged in.</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <SignIn />
        </div>
      )}
    </main>
  );
}
