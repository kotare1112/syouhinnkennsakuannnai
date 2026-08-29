import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Register() {
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await register(form);
      navigate('/admin/branches');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="screen">
      <h1>企業アカウント新規登録</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          企業名
          <input value={form.companyName} onChange={update('companyName')} required />
        </label>
        <label>
          担当者名
          <input value={form.name} onChange={update('name')} />
        </label>
        <label>
          メールアドレス
          <input type="email" value={form.email} onChange={update('email')} required />
        </label>
        <label>
          パスワード
          <input type="password" value={form.password} onChange={update('password')} required />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit">登録する</button>
      </form>
      <p>
        すでにアカウントをお持ちの場合は <Link to="/admin/login">ログイン</Link>
      </p>
    </div>
  );
}
