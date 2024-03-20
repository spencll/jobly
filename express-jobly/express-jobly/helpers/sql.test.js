const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
  test("returns correctly", function () {
    let dataToUpdate = { firstName: "Aliya", age: 32 };
    let jsToSql = {
      firstName: "first_name",
      lastName: "last_name",
      isAdmin: "is_admin",
    };
    let { setCols, values } = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(setCols).toEqual(`${'"first_name"=$1'}, ${'"age"=$2'}`);
    expect(values).toEqual(["Aliya", 32]);
  });

  test("No data entered", function () {
    let dataToUpdate = {};
    let jsToSql = {
      firstName: "first_name",
      lastName: "last_name",
      isAdmin: "is_admin",
    };
    let test = () => sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(test).toThrow(BadRequestError);
  });

});
