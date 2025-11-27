#!/bin/bash

# Replace next/link with react-router-dom
find components -name "*.tsx" -type f -exec sed -i '' 's/from ['\''"]next\/link['\''"]/from '\''react-router-dom'\''/g' {} \;

# Replace next/navigation with react-router-dom
find components -name "*.tsx" -type f -exec sed -i '' 's/from ['\''"]next\/navigation['\''"]/from '\''react-router-dom'\''/g' {} \;

# Replace Link from next/link with Link from react-router-dom (already done above)
# Replace useRouter with useNavigate
find components -name "*.tsx" -type f -exec sed -i '' 's/useRouter()/useNavigate()/g' {} \;
find components -name "*.tsx" -type f -exec sed -i '' 's/const router = useNavigate()/const navigate = useNavigate()/g' {} \;
find components -name "*.tsx" -type f -exec sed -i '' 's/router\.push(/navigate(/g' {} \;
find components -name "*.tsx" -type f -exec sed -i '' 's/router\.replace(/navigate(/g' {} \;

# Replace usePathname with useLocation
find components -name "*.tsx" -type f -exec sed -i '' 's/usePathname()/useLocation()/g' {} \;
find components -name "*.tsx" -type f -exec sed -i '' 's/const pathname = useLocation()/const location = useLocation()\n  const pathname = location.pathname/g' {} \;

# Replace useSearchParams
find components -name "*.tsx" -type f -exec sed -i '' 's/useSearchParams()/useSearchParams()/g' {} \;

echo "Replacement complete!"
