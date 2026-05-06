const gmail = "test";
try {
const html = `
    ${gmail ? \`
    <div>${gmail}</div>\` : ''}
`;
console.log("Success");
} catch(e) {
console.error(e);
}
