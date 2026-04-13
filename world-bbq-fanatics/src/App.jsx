import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ProfileSetup from './pages/ProfileSetup'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import MyRecipes from './pages/MyRecipes'
import NewRecipe from './pages/NewRecipe'
import RecipeDetail from './pages/RecipeDetail'
import UserProfile from './pages/UserProfile'
import EditProfile from './pages/EditProfile'
import Community from './pages/Community'
import ChannelChat from './pages/ChannelChat'
import Chat from './pages/Chat'
import PrivateChat from './pages/PrivateChat'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"            element={<Login />} />
        <Route path="/register"         element={<Register />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />
        <Route path="/profile-setup"    element={<ProfileSetup />} />

        {/* Protected routes — share Navbar + auth context */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard"       element={<Dashboard />} />
          <Route path="/profile/me"      element={<UserProfile />} />
          <Route path="/profile/edit"    element={<EditProfile />} />
          <Route path="/profile/:username" element={<UserProfile />} />
          <Route path="/recipes"         element={<MyRecipes />} />
          <Route path="/recipes/new"     element={<NewRecipe />} />
          <Route path="/recipes/:id"     element={<RecipeDetail />} />
          <Route path="/community"        element={<Community />} />
          <Route path="/community/:id"   element={<ChannelChat />} />
          <Route path="/chat"            element={<Chat />} />
          <Route path="/chat/:id"        element={<PrivateChat />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
