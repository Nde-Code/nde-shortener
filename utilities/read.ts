export async function readInFirebaseRTDB<T>(FIREBASE_URL: string, path: string): Promise<T | null> {

    try {

        const url: string = `${FIREBASE_URL}${path}.json`;

        const res: Response = await fetch(url, {

            method: "GET",

            headers: {

                "Content-Type": "application/json",

            },

        });

        if (!res.ok) return null;

        const data: T = await res.json();
        
        return data;

    } catch (err) {

        console.error(err);

        return null;

    }

}
