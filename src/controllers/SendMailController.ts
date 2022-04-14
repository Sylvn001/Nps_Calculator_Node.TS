import { Request, Response } from "express";
import { resolve } from "path";
import { getCustomRepository } from "typeorm";
import { AppError } from "../errors/AppError";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import SendMailService from "../services/SendMailService";

class SendMailController{
  async execute(request: Request, response: Response){
    const {email, survey_id} = request.body;
    const usersRepository = getCustomRepository(UsersRepository)
    const surveyRepository = getCustomRepository(SurveysRepository)
    const surveysUsersRepository = getCustomRepository(SurveysUsersRepository)

    const userAlreadyExists = await usersRepository.findOne({ email })

    if(!userAlreadyExists)
      throw new AppError("User does not exists!");

    const surveyAlreadyExists = await surveyRepository.findOne({id: survey_id})
    if(!surveyAlreadyExists)
      throw new AppError("Survey does not exists!");

    const surveyUserAlreadyExists = await surveysUsersRepository.findOne({
      where: { user_id: userAlreadyExists.id, value: null },
      relations: ["user", "survey"],
    });

    const npsPath = resolve(__dirname,'..', "views", "emails", "npsMail.hbs")
    const variables = {
      name: userAlreadyExists.name,
      title: surveyAlreadyExists.title,
      description: surveyAlreadyExists.description,
      id: "",
      link: process.env.URL_MAIL
    }

    if(surveyUserAlreadyExists){
      variables.id = surveyUserAlreadyExists.id
      await SendMailService.execute(email,surveyAlreadyExists.title,variables,npsPath)
      return response.status(201).json(surveyUserAlreadyExists)
    }

    const surveyUser = surveysUsersRepository.create({
      user_id: userAlreadyExists.id,
      survey_id
    })

    await surveysUsersRepository.save(surveyUser)

    variables.id = surveyUser.id

    await SendMailService.execute(email,surveyAlreadyExists.title,variables,npsPath)

    return response.status(201).json({surveyUser})
  }
}

export {SendMailController}