import SignIn from "~/routes/signin";
import SignUp from "~/routes/signup";

export function Welcome() {
  return (
    <main>
      <SignUp />
      <SignIn />
    </main>
  );
}
