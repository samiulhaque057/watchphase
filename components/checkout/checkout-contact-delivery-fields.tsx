type Props = {
  /** Prefix for DOM ids (`buy-*` vs `cart-*`). */
  idPrefix: string;
  disabled?: boolean;
  /** When false, marks fields not required (e.g. empty cart state). */
  requireFields?: boolean;
  /** Optional postcode field toggle. */
  showPostcode?: boolean;
};

export function CheckoutContactDeliveryFields({
  idPrefix,
  disabled = false,
  requireFields = true,
  showPostcode = true,
}: Props) {
  const req = requireFields;
  return (
    <>
      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">
          Contact
        </legend>
        <div>
          <label htmlFor={`${idPrefix}-full-name`} className="sr-only">
            Full name
          </label>
          <input
            id={`${idPrefix}-full-name`}
            name="fullName"
            type="text"
            autoComplete="name"
            required={req}
            placeholder="Full name"
            className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-email`} className="sr-only">
            Email
          </label>
          <input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required={req}
            placeholder="Email address"
            className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-phone`} className="sr-only">
            Phone number
          </label>
          <input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            required={req}
            placeholder="Mobile number"
            className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">
          Delivery
        </legend>
        <div>
          <label htmlFor={`${idPrefix}-address`} className="sr-only">
            Address line 1
          </label>
          <input
            id={`${idPrefix}-address`}
            name="address1"
            type="text"
            autoComplete="address-line1"
            required={req}
            placeholder="Street address"
            className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />
        </div>
        <div className={`grid gap-4 ${showPostcode ? "sm:grid-cols-2" : ""}`}>
          <div>
            <label htmlFor={`${idPrefix}-city`} className="sr-only">
              City
            </label>
            <input
              id={`${idPrefix}-city`}
              name="city"
              type="text"
              autoComplete="address-level2"
              required={req}
              placeholder="City"
              className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>
          {showPostcode ? (
            <div>
              <label htmlFor={`${idPrefix}-postcode`} className="sr-only">
                Postal code
              </label>
              <input
                id={`${idPrefix}-postcode`}
                name="postcode"
                type="text"
                autoComplete="postal-code"
                required={req}
                placeholder="Postal code"
                className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          ) : null}
        </div>
        <textarea
          name="instructions"
          rows={3}
          placeholder="Delivery notes (optional)"
          className="w-full resize-y border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          id={`${idPrefix}-instructions`}
        />
      </fieldset>
    </>
  );
}
