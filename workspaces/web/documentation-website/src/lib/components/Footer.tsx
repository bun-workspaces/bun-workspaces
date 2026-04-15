/** @todo Figure out how to set this in the theme/layout once using rspress v2  */
export const Footer = () => {
  return (
    <footer className="footer">
      <p>
        © {process.env.YEAR}{" "}
        <a href="https://smorsic.io" target="_blank" rel="noopener noreferrer">
          Smorsic Labs, LLC
        </a>
        . All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
