import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Haven homepage">
          <span className="brand-mark">h.</span>
          <span>haven<span className="brand-light">estate</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/properties?category=house_land">Buy</Link>
          <Link href="/properties?type=rent">Rent</Link>
          <Link href="/properties?category=house_land">Land</Link>
          <Link href="/properties?category=commercial">Commercial</Link>
          <Link href="/properties?category=room">Rooms</Link>
        </nav>
        <div className="header-actions">
          <Link className="nav-login" href="/login">Log in</Link>
          <Link className="button button-dark button-small" href="/register">List a property <span aria-hidden="true">↗</span></Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open navigation menu"><span></span><span></span></summary>
          <nav aria-label="Mobile navigation">
            <Link href="/properties">Explore properties</Link>
            <Link href="/properties?type=rent">Rent</Link>
            <Link href="/properties?category=room">Rooms</Link>
            <Link href="/login">Log in</Link>
            <Link href="/register">List a property</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
