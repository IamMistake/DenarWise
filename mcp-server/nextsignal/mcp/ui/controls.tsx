import { StoreIcon } from "./icons";
export function StoreField({
  itemId,
  value,
  stores,
  disabled,
  onChange
}: {
  itemId: string;
  value: string;
  stores: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const listId = `stores-${itemId}`;

  return (
    <div className="store-wrap">
      <span className="store-icon"><StoreIcon /></span>
      <input
        className="store-input"
        aria-label="Place to buy"
        list={listId}
        value={value}
        disabled={disabled}
        placeholder="Any store"
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {stores.map((store) => <option value={store} key={store} />)}
      </datalist>
    </div>
  );
}

export function QuantityStepper({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  const numericValue = /^\d+$/.test(value.trim()) ? Number.parseInt(value, 10) : 1;
  return (
    <div className="stepper" aria-label={`Quantity ${value}`}>
      <button type="button" aria-label="Decrease quantity" disabled={disabled || numericValue <= 1} onClick={() => onChange(String(numericValue - 1))}>−</button>
      <span className="quantity">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={disabled || numericValue >= 10000} onClick={() => onChange(String(numericValue + 1))}>+</button>
    </div>
  );
}
