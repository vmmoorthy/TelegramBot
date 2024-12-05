
type Address = {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    type?: string;
};

type Phone = {
    phone: string;
    type?: string;
};

type Email = {
    email: string;
    type?: string;
};

type URL = {
    url: string;
    type?: string;
};

type Org = {
    company?: string;
    department?: string;
    title?: string;
};

type Name = {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    suffix?: string;
    prefix?: string;
};

type Contact = {
    name: Name;
    org?: Org;
    phones?: Phone[];
    emails?: Email[];
    addresses?: Address[];
    urls?: URL[];
    birthday?: string;
};

export function convertWhatsAppToVCard(contact: Contact): string {
    const {
        name: { formatted_name, first_name, last_name, middle_name, suffix, prefix },
        org: { company, department, title } = {},
        phones = [],
        emails = [],
        addresses = [],
        urls = [],
        birthday
    } = contact;

    // Start building the vCard string
    let vCard = `BEGIN:VCARD
VERSION:3.0
FN:${formatted_name || ""}
N:${last_name || ""};${first_name || ""};${middle_name || ""};${prefix || ""};${suffix || ""}
ORG:${company || ""};${department || ""}
TITLE:${title || ""}
BDAY:${birthday || ""}
  `.trim();

    // Add phone numbers
    phones.forEach((phone) => {
        vCard += `\nTEL;TYPE=${phone.type || "CELL"}:${phone.phone}`;
    });

    // Add email addresses
    emails.forEach((email) => {
        vCard += `\nEMAIL;TYPE=${email.type || "INTERNET"}:${email.email}`;
    });

    // Add addresses
    addresses.forEach((address) => {
        vCard += `\nADR;TYPE=${address.type || "HOME"}:;;${address.street || ""};${address.city || ""};${address.state || ""};${address.zip || ""};${address.country || ""}`;
    });

    // Add URLs
    urls.forEach((url) => {
        vCard += `\nURL;TYPE=${url.type || "WORK"}:${url.url}`;
    });

    // End vCard
    vCard += `\nEND:VCARD`;

    return vCard;
}