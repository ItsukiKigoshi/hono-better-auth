import { useEffect, useState } from "react";
import { authClient } from "./lib/auth-client";

export default function App() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState < "email" | "otp" | "authenticated" > ("email");
  const [user, setUser] = useState < any > (null);
  const [passkeys, setPasskeys] = useState < any[] > ([]);
  const [name, setName] = useState(""); // 新規登録時用

  // Conditional UI (autoFill) のセットアップ
  useEffect(() => {
    if (step !== "email") return;

    const setupConditionalUI = async () => {
      // 関数が存在し、かつ結果がtrueの場合のみ実行
      if (
          typeof window !== "undefined" &&
          typeof PublicKeyCredential?.isConditionalMediationAvailable === "function"
      ) {
        const available = await PublicKeyCredential.isConditionalMediationAvailable();
        if (available) {
          authClient.signIn.passkey({ autoFill: true }).catch(() => {
            // autoFillは失敗しても問題なし（未登録時など）
          });
        }
      }
    };

    setupConditionalUI();
  }, [step]);

  // ユーザー状態の確認
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setStep("authenticated");
        loadPasskeys();
      }
    });
  }, []);

  // ===== Email OTP フロー =====

  // 1. OTPを送信
  const sendOTP = async () => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    if (error) {
      alert(error.message);
      return;
    }
    setStep("otp");
    alert("OTPをメールで送信しました");
  };

  // 2. OTPでサインイン（新規ユーザーは自動登録）
  const verifyOTP = async () => {
    const { data, error } = await authClient.signIn.emailOtp({
      email,
      otp,
      name: name || undefined, // 新規登録時のみ使用
    });
    if (error) {
      alert(error.message);
      return;
    }
    setUser(data?.user);
    setStep("authenticated");
    loadPasskeys();
  };

  // ===== Passkey フロー =====

  // Passkey一覧を取得
  const loadPasskeys = async () => {
    const { data } = await authClient.passkey.listUserPasskeys({});
    if (data) setPasskeys(data);
  };

  // Passkeyを登録
  const registerPasskey = async () => {
    const { error } = await authClient.passkey.addPasskey({
      name: "My Passkey",
    });
    if (error) {
      alert(error.message);
      return;
    }
    alert("Passkeyを登録しました");
    loadPasskeys();
  };

  // Passkeyでサインイン
  const signInWithPasskey = async () => {
    const { data, error } = await authClient.signIn.passkey({
      autoFill: false,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setUser(data?.user);
    setStep("authenticated");
    loadPasskeys();
  };

  // Passkeyを削除
  const deletePasskey = async (id: string) => {
    await authClient.passkey.deletePasskey({ id });
    loadPasskeys();
  };

  // サインアウト
  const signOut = async () => {
    await authClient.signOut();
    setUser(null);
    setStep("email");
    setEmail("");
    setOtp("");
    setPasskeys([]);
  };

  // ===== レンダリング =====

  // 認証済み状態
  if (step === "authenticated" && user) {
    return ( <div style = { { padding: 20 } } >
          <h1> ようこそ、 { user.email } さん </h1>

          <div style = { { marginTop: 20 } } >
            <h2 > Passkey管理 </h2>
            <button onClick = { registerPasskey } >
            +新しいPasskeyを登録 </button>

            <ul style = { { marginTop: 10 } } > {
              passkeys.map((pk) => ( <li key = { pk.id } > { pk.name || "Passkey" }({ pk.deviceType }) <button onClick = {
                    () => deletePasskey(pk.id) } > 削除 </button> </li>
              ))
            } {
                passkeys.length === 0 && ( <p > Passkeyが登録されていません </p>
                )
            } </ul>
          </div>

          <button onClick = { signOut } style = { { marginTop: 20 } } >
            サインアウト </button>
    </div>
    );
  }

  // OTP入力画面
  if (step === "otp") {
    return ( <div style = { { padding: 20 } } >
          <h1 > OTPを入力 </h1>
          <p > { email } に送信された6桁のコードを入力 </p> <
            input type = "text"
                  placeholder = "123456"
                  value = { otp } onChange = {
          (e) => setOtp(e.target.value) } maxLength = { 6 }
        /> <button onClick = { verifyOTP } > 確認 </button>
          <button onClick = {() => setStep("email") } > 戻る </button>
    </div>
    );
  }

  // メール入力画面（初期画面）
  return (
      <div style = { { padding: 20 } }>
        <h1> パスワードレス認証 </h1>
        { /* Passkeyサインイン（登録済みユーザー向け） */ }
        <div style = { { marginBottom: 20 } }>
          <button onClick = { signInWithPasskey }> 🔑Passkeyでサインイン</button>
        </div>
        <hr />
        { /* Email OTPフォーム */ }
        <div>
          <h2> Email OTPでサインイン </h2>
          <input type = "email"
              placeholder = "メールアドレス"
              value = { email } onChange = {
            (e) => setEmail(e.target.value) }
              // Conditional UI用: autoCompleteにwebauthnを追加
              autoComplete = "username webauthn" />
          { /* 新規登録時のみ表示 */ }
          {!user && ( <input type = "text"
                             placeholder = "名前（新規登録時）"
                             value = { name } onChange = {
            (e) => setName(e.target.value) }/>
        )
    } <button onClick = { sendOTP } > OTPを送信 </button>
      </div>

      <div style = { { marginTop: 20, fontSize: 12, color: "#666" } } >
        ヒント: Passkeyを登録すれば、 次回からワンタップでサインインできます
      </div>
    </div>)
};