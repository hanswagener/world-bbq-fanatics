import { Navigate } from 'react-router-dom'

// /recipes is handled by MyRecipes; this keeps any stale links working
export default function Recipes() {
  return <Navigate to="/recipes" replace />
}
