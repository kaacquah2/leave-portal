#!/bin/bash
# Script to remove unused Radix UI packages
# Based on RADIX_PACKAGES_AUDIT_REPORT.md findings

echo "Removing unused Radix UI packages..."

# Remove packages from package.json
npm uninstall \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-toggle-group

# Remove UI component files
rm -f components/ui/hover-card.tsx
rm -f components/ui/menubar.tsx
rm -f components/ui/navigation-menu.tsx
rm -f components/ui/toggle-group.tsx

echo "✅ Unused Radix packages removed"
echo "📦 Bundle size reduced by ~70KB"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run build"
echo "3. Test the application thoroughly"

