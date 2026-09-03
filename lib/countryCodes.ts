export interface CountryCode {
    name: string;
    dialCode: string;
    code: string;
}

/** Pakistan. The phone field starts here rather than at COUNTRY_CODES[0],
 *  so reordering the list below cannot silently change the default. */
export const DEFAULT_DIAL_CODE = "+92";

export const COUNTRY_CODES: CountryCode[] = [
    { name: "United States", dialCode: "+1", code: "US" },
    { name: "United Kingdom", dialCode: "+44", code: "GB" },
    { name: "Pakistan", dialCode: "+92", code: "PK" },
    { name: "India", dialCode: "+91", code: "IN" },
    { name: "United Arab Emirates", dialCode: "+971", code: "AE" },
    { name: "Saudi Arabia", dialCode: "+966", code: "SA" },
    { name: "Canada", dialCode: "+1", code: "CA" },
    { name: "Australia", dialCode: "+61", code: "AU" },
    { name: "Germany", dialCode: "+49", code: "DE" },
    { name: "France", dialCode: "+33", code: "FR" },
    { name: "China", dialCode: "+86", code: "CN" },
    { name: "Japan", dialCode: "+81", code: "JP" },
    { name: "Brazil", dialCode: "+55", code: "BR" },
    { name: "Bangladesh", dialCode: "+880", code: "BD" },
    { name: "Turkey", dialCode: "+90", code: "TR" },
    { name: "Egypt", dialCode: "+20", code: "EG" },
    { name: "Nigeria", dialCode: "+234", code: "NG" },
    { name: "South Africa", dialCode: "+27", code: "ZA" },
    { name: "Indonesia", dialCode: "+62", code: "ID" },
    { name: "Malaysia", dialCode: "+60", code: "MY" },
];