/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/index.html', permanent: true },
      { source: '/site/en', destination: '/site/en/index.html', permanent: true },
      { source: '/site/en/', destination: '/site/en/index.html', permanent: true },
      { source: '/site/admin', destination: '/site/admin/index.html', permanent: true },
      { source: '/site/admin/', destination: '/site/admin/index.html', permanent: true },
    ];
  },
};

export default nextConfig;
