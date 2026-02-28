import { RapidRuntime } from "./RapidRuntime.cjs";

const PORT = 3000;

const app = new RapidRuntime(["../registry/packages", "../registry/apps"], "../registry/_lib");

app.listen(PORT).then(() => {
    console.log(`Server running at http://localhost:${PORT}/`);
});


/*
import { Client } from "ldapts";
(async () => {
    const COLLECTED_ID = 'tl621'

    const url = 'ldaps://ldap.lookup.cam.ac.uk';
    const bindDN = `ou=people,o=University of Cambridge,dc=cam,dc=ac,dc=uk`;
    const searchDN = 'ou=people,o=University of Cambridge,dc=cam,dc=ac,dc=uk';

    const client = new Client({
        url
    });

    try {
        await client.bind(bindDN);

        const { searchEntries, searchReferences } = await client.search(searchDN, {
            scope: 'sub',
            filter: `(uid=${COLLECTED_ID})`,
        });

        console.log(searchEntries, searchReferences);
    } catch (ex) {
        throw ex;
    } finally {
        await client.unbind();
    }
})()
*/