const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.
// Function for converting request data to SQL query data for easy insertion 

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // Gets all the keys (table columns) of the object in array

  const keys = Object.keys(dataToUpdate);
  // Ex. {firstName: 'Aliya', age: 32} => [firstName, age]

  // if no key (data) then error
  if (keys.length === 0) throw new BadRequestError("No data");

  
  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  // Every key (table column) mapped as table column =$index (parem)
  // jsToSql converts js name to sql column name only if it differs
  // Ex. firstName -> first_name

  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    // Part of query that comes after SET
    // `'"first_name"=$1', '"age"=$2'`
    
    setCols: cols.join(", "),

    // Parametized query, will be spread out in array in User.Update 
    // ["Aliya", 32]
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
