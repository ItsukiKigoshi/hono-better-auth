import { Form } from "react-router"
import { useState } from "react"
import { authClient } from "~/lib/auth"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isNewUser, setIsNewUser] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isNewUser) {
      await authClient.signUp.email({
        email,
        password,
        name,
      }, {
        onSuccess: () => alert("Account created successfully!"),
        onError: (ctx) => alert(ctx.error.message),
      })
    } else {
      await authClient.signIn.email({
        email,
        password,
      }, {
        onError: (ctx) => {
          if (ctx.error.status === 401 || ctx.error.code === "USER_NOT_FOUND") {
            setIsNewUser(true)
            alert("Account not found. Please enter your name to sign up.")
          } else {
            alert(ctx.error.message)
          }
        },
      })
    }
  }

  return (
    <div>
      <h2>{isNewUser ? "Sign Up" : "Sign In"}</h2>
      
      <Form onSubmit={handleAuth}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        
        {isNewUser && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Username"
            required
          />
        )}

        <button type="submit" style={{ display: "block", marginTop: "10px" }}>
          {isNewUser ? "Create Account" : "Sign In"}
        </button>
      </Form>

      <div style={{ marginTop: "15px", fontSize: "0.9em" }}>
        {isNewUser ? (
          <p>
            Already have an account?{" "}
            <button 
              type="button"
              onClick={() => setIsNewUser(false)} 
              style={{ background: "none", border: "none", color: "blue", cursor: "pointer", textDecoration: "underline" }}
            >
              Sign In here
            </button>
          </p>
        ) : (
          <p>
            Don't have an account?{" "}
            <button 
              type="button"
              onClick={() => setIsNewUser(true)} 
              style={{ background: "none", border: "none", color: "blue", cursor: "pointer", textDecoration: "underline" }}
            >
              Sign Up here
            </button>
          </p>
        )}
      </div>
    </div>
  )
}