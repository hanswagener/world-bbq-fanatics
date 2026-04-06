import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ProfileSetup from './pages/ProfileSetup'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import MyRecipes from './pages/MyRecipes'
import NewRecipe from './pages/NewRecipe'
import RecipeDetail from './pages/RecipeDetail'
import Community from './pages/Community'
import Chat from './pages/Chat'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />

        {/* Protected routes — share Navbar + auth context */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard"       element={<Dashboard />} />
          <Route path="/recipes"         element={<MyRecipes />} />
          <Route path="/recipes/new"     element={<NewRecipe />} />
          <Route path="/recipes/:id"     element={<RecipeDetail />} />
          <Route path="/community"       element={<Community />} />
          <Route path="/chat"            element={<Chat />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
