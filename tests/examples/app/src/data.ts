// Configure the data layer cache once at app entry.
// Imported by any page or component that uses runLoader / useLoaderData.

import { configure } from "@rafters/astro-data";
import { createNanostoresCache } from "@rafters/astro-data/nanostores";

configure({ cache: createNanostoresCache() });
