require("dotenv").config();
const faunadb = require("faunadb");

const q = faunadb.query;

const adminClient = new faunadb.Client({
  secret: process.env.FAUNA_SECRET,
});
const test = async () => {
  try {
    const result = await adminClient.query(q.Delete(q.Database("my_new_db")));
    console.log(result);
  } catch (e) {
    console.log(e);
  }
};

test();
