"use server";

import { revalidatePath } from "next/cache";
import { SubjectSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";

type CreateState = { success: boolean; error: boolean }

export const createSubject = async(currentState: CreateState, data: SubjectSchema) => {

    try {
        await prisma?.subject.create({
            data: {
                name: data.name
            }
         
        })
//  can not work when use a react tostify message 

        // revalidatePath("/list/subjects")
        return {
                success: true,
                error: false,
               }
        
    } catch (error) {
        console.log("Error creating subject: ", error);
         return{
                success: false,
                error: true,
          }
        
    }
    
}
export const updateSubject = async(data: SubjectSchema) => {

    try {
        await prisma?.subject.create({
            data: {
                name: data.name
            }
         
        })

        revalidatePath("/list/subjects")
        
    } catch (error) {
        console.log("Error creating subject: ", error);
        
    }
    
}