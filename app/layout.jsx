import './globals.css';

export const metadata = {
  title: 'Clothing Store Ecommerce',
  description: 'Fashion ecommerce storefront and admin dashboard'
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;

