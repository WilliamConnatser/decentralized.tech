export const objToQuery = (filter) => {

    //If there's no query params return an empty string
    if(Object.keys(filter).length === 0) return '';

    //Query strings begin with a question mark
    let queryString = '?';

    //For each key/value pair
    Object.entries(filter).forEach((arr, index) => {

        //Use destructing to get the key/value
        const [key,value] = arr;

        //If it's not the first key/value pair then add an ampersand
        if(index !== 0) queryString += '&';

        //Add the key/value pair to the query string
        queryString += `${key}=${value}`;
    });

    return queryString;
}