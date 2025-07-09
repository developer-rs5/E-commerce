import jwt from "jsonwebtoken";

export const genToken = async (userID) => {
    try {
        const token = await jwt.sign({ id: userID }, process.env.JWT_SECRET, {
            expiresIn: "3d"
        });
        return token;
    } catch (error) {
        console.log(`Error while generating token:\n${error}`);
    }
};
