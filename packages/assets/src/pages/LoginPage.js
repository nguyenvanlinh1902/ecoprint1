import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt with:', { email, password });
    // Xử lý logic đăng nhập tại đây
  };

  const formStyle = {
    width: '100%'
  };

  const formGroupStyle = {
    marginBottom: '15px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#008060',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px'
  };

  const linkContainerStyle = {
    textAlign: 'center',
    marginTop: '20px'
  };

  const linkStyle = {
    color: '#008060',
    textDecoration: 'none',
    display: 'block',
    margin: '5px 0'
  };

  return (
    <form style={formStyle} onSubmit={handleSubmit}>
      <div style={formGroupStyle}>
        <label style={labelStyle} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          style={inputStyle}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div style={formGroupStyle}>
        <label style={labelStyle} htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          type="password"
          style={inputStyle}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" style={buttonStyle}>Đăng nhập</button>

      <div style={linkContainerStyle}>
        <Link to="/forgot-password" style={linkStyle}>Quên mật khẩu?</Link>
        <Link to="/register" style={linkStyle}>Chưa có tài khoản? Đăng ký ngay</Link>
      </div>
    </form>
  );
}

export default LoginPage; 