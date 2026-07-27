import React, { useState, useEffect } from 'react';
import './App.css';
import logoImg from './assets/logo.png';

// ייבוא הרכיבים החדשים שלנו מהתיקייה שלהם
import Login from './components/Login';
import Register from './components/Register';
import ArtistDashboard from './components/ArtistDashboard';
import WriterDashboard from './components/WriterDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogin from './components/admin/AdminLogin';

export default function App() {
  // ניהול מסכים: 'login' | 'register' | 'artist_dash' | 'writer_dash' | 'admin_dash'
  const [currentScreen, setCurrentScreen] = useState('login');
  // המשתמש שמחובר כרגע למערכת
  const [currentUser, setCurrentUser] = useState(null);
  // מערך המשתמשים שייקרא מהשרת
  const [users, setUsers] = useState([]);

  const fetchUsers = () => {
  fetch('http://localhost:5286/api/users')
    .then(res => res.json())
    .then(data => {
      // התאמת מבנה הנתונים מה-DB (אותיות קטנות/גדולות) למבנה של ה-React
      const formattedUsers = data.map(u => ({
        userId: u.userId,
        username: u.userName,
        name: u.fullName,
        email: u.email,
        idCard: u.identityCard,
        phone: u.phoneNumber,
        clubId: u.clubId,
        isWriter: u.userType === 'author' || u.userType === 'writer',
        isArtist: u.userType === 'artist',
        isAdmin: u.userType === 'admin',
      }));
      setUsers(formattedUsers);
    })
    .catch(err => console.error("שגיאה במשיכת משתמשים:", err));
};

  // טעינת המשתמשים מיד כשהאפליקציה עולה
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.isAdmin) {
      setCurrentScreen('admin_dash');
    } else if (user.isWriter) {
      setCurrentScreen('writer_dash');
    } else {
      setCurrentScreen('artist_dash');
    }
  };
// פונקציה חדשה: מעדכנת את המשתמש הנוכחי במערכת ומרעננת את רשימת המשתמשים הכללית
const handleUserUpdate = (updatedUser) => {
  setCurrentUser(updatedUser);
  fetchUsers(); // מרענן את כל הרשימה ברקע
};
const handleRegisterSuccess = async (newUser) => {
  const userToPost = {
    userName: newUser.username,
    passwordHash: newUser.password, // הסיסמה תוצפן ב-BCrypt בשרת
    fullName: newUser.name,
    identityCard: newUser.idCard,   // מיפוי תעודת הזהות ל-#C
    phoneNumber: newUser.phone,     // מיפוי הטלפון ל-#C
    email: newUser.email,
    userType: newUser.isWriter ? 'author' : 'artist',
    clubId: newUser.clubId ? parseInt(newUser.clubId) : null
  };

  try {
    const response = await fetch('http://localhost:5286/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userToPost),
    });

    if (response.ok) {
      alert(`המשתמש ${newUser.username} נרשם בהצלחה!`);
      if (typeof fetchUsers === 'function') fetchUsers(); 
      setCurrentScreen('login'); 
    } else {
      const errorText = await response.text();
      alert(`ההרשמה נכשלה: ${errorText}`);
    }
  } catch (error) {
    console.error('שגיאה בתקשורת עם השרת:', error);
    alert('שגיאה בתקשורת עם השרת.');
  }
};

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  const isAuthScreen = currentScreen === 'login' || currentScreen === 'register' || currentScreen === 'admin_login';


  return (
    <div className={`app-container ${isAuthScreen ? 'auth-mode' : 'dashboard-mode'}`}>
      
      {isAuthScreen ? (
        <div className="large-logo">
          <img src={logoImg} alt="ComicSketch Logo" className="logo-large-spec" />
          <p>The smart bridge between text and illustration</p>
        </div>
      ) : (
        <div className="small-logo-sticky">
          <img src={logoImg} alt="ComicSketch Logo" className="logo-small-spec" />
        </div>
      )}

      {currentScreen === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setCurrentScreen('register')}
          onNavigateToAdmin={() => setCurrentScreen('admin_login')}
        />
      )}

      {currentScreen === 'admin_login' && (
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'register' && (
        <Register 
          onRegisterSuccess={handleRegisterSuccess} 
          onCancel={() => setCurrentScreen('login')} 
        />
      )}

      {currentScreen === 'artist_dash' && currentUser && (
        <ArtistDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
        />
      )}
      
      {currentScreen === 'writer_dash' && currentUser && (
  <WriterDashboard
    user={currentUser}
    onLogout={handleLogout}
    onUserUpdate={handleUserUpdate}
  />
)}

      {currentScreen === 'admin_dash' && currentUser && (
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
