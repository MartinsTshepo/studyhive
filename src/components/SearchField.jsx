import Icon from "./Icon";

/** iOS-style search field. `block` makes it fill its container instead of centring at a fixed width. */
export default function SearchField({ id, value, onChange, onSubmit, placeholder, block = false }) {
  return (
    <form
      className={`search${block ? " search--block" : ""}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
        document.activeElement?.blur?.(); // closes the on-screen keyboard
      }}
    >
      <Icon name="search" size={20} className="search__icon" />
      <input
        id={id}
        name="search"
        className="search__input"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="none"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="search__clear" aria-label="Clear search" onClick={() => onChange("")}>
          <Icon name="x" size={14} strokeWidth={2.6} />
        </button>
      )}
    </form>
  );
}
